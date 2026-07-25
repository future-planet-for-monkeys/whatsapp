import { Controller, Get, Query, Route, Tags, Security, Res, type TsoaResponse, Path, Post, Body, UploadedFile, Request, Produces } from "tsoa";
import { type Chat, ChatId, Client, Message, MessageId, MessageMedia, MessageTypes, WAState } from "whatsapp-web.js";
import { CLIENT } from "../client";
import { WhatsAppClientWithCache } from "../services/WhatsAppService.v2";
import type { Request as ExpressRequest } from "express";
import fs from "node:fs";
import {
    getMessageSender,
    getMessageReadBy,
    upsertMessage,
    markMessageSent,
    markMessageSeen,
    logMessageChange,
    getMessageEditDeleteInfo,
    setMessageReaction,
    getReactionAttribution,
} from "../services/MessageService";

// ── 0.8: Widen the union to match real-world WhatsApp types ────────────────
export type AllowedMessageTypes =
    | MessageTypes.TEXT       // 'chat'
    | MessageTypes.IMAGE      // 'image'
    | MessageTypes.VIDEO      // 'video'
    | MessageTypes.AUDIO      // 'audio'
    | MessageTypes.VOICE      // 'ptt' — voice notes, extremely common
    | MessageTypes.DOCUMENT   // 'document'
    | MessageTypes.STICKER    // 'sticker'
    | MessageTypes.REVOKED
    | 'unsupported';

const RENDERABLE = new Set<string>([
    MessageTypes.TEXT, MessageTypes.IMAGE, MessageTypes.VIDEO,
    MessageTypes.AUDIO, MessageTypes.VOICE, MessageTypes.DOCUMENT,
    MessageTypes.STICKER,
    MessageTypes.REVOKED,
]);

function toAllowedType(type: string): AllowedMessageTypes {
    return RENDERABLE.has(type) ? (type as AllowedMessageTypes) : 'unsupported';
}

export class ChatIdDto {
    constructor(chatId: ChatId) {
        this.server = chatId.server;
        this._serialized = chatId._serialized;
        this.user = chatId.user;
        this.id = chatId._serialized;
    }
    id: string;
    server: string;
    user: string;
    _serialized: string;
}

export interface ChatDto {
    archived: boolean;
    id: ChatIdDto;
    isGroup: boolean;
    name: string;
    chatAvatarUrl: string | null;
    unreadCount: number;
    lastMessage: MessageDto | null;
    pinned: boolean;
    /** Unix epoch seconds — added in Phase 0.3 */
    timestamp: number;
}

export interface MessageIdDto {
    fromMe: boolean;
    remote: string;
    id: string;
    _serialized: string;
}

export interface ReactionDto {
    /** The emoji character */
    emoji: string;
    /** Number of senders who reacted with this emoji (from WhatsApp live data) */
    count: number;
    /** Whether the current WhatsApp identity has reacted with this emoji */
    reactedByMe: boolean;
    /** App users who set this reaction (from local DB attribution) */
    users: { userId?: string; name: string }[];
}

export interface MessageDto {
    id: MessageIdDto;
    body: string;
    hasMedia: boolean;
    type: AllowedMessageTypes;
    from: ContactInfoDto;
    sentByUser: {
        userId: string;
        name: string;
        phoneNumber: string;
    }
    readBy: {
        [userId: string]: any; // Maps userId to a boolean indicating if the user has read the message
        someone: boolean; // Indicates if at least one user has read the message
        me: boolean; // Indicates if the current user has read the message
        users: { userId: string; name: string }[];
    };
    /** Unix epoch seconds */
    timestamp: number;
    /** Whether the message has been edited (via our app) */
    isEdited: boolean;
    /** Who performed the last edit, if any */
    editedBy: { userId: string; name: string } | null;
    /** Whether the message has been deleted (via our app) */
    isDeleted: boolean;
    /** Who performed the deletion, if any */
    deletedBy: { userId: string; name: string } | null;
    /** Aggregated reactions from WhatsApp live data, enriched with local attribution */
    reactions: ReactionDto[];
}

export interface ContactInfoDto {
    lid: string | null;
    pn: string | null;
    name: string | null;
    avatarUrl: string | null;
}

async function lastAllowedTypeMessage(client: WhatsAppClientWithCache, chat: Chat, currentUserId: string): Promise<MessageDto | null> {
    const lastMessagePromise = chat.lastMessage ? toMessageDto(client, chat.lastMessage,currentUserId,  false) : null;
    const lastMessage = await lastMessagePromise;
    if (lastMessage && lastMessage.type !== 'unsupported') {
        return lastMessage;
    }
    const messages = await chat.fetchMessages({ limit: 10 });
    const lastAllowed = messages.reverse().find(msg => toAllowedType(msg.type) !== 'unsupported');
    if (lastAllowed) {
        return await toMessageDto(client, lastAllowed, currentUserId, false);
    }
    return null;
}

async function toChatDto(client: WhatsAppClientWithCache, chat: Chat, currentUserId: string, resolveImmediately = false): Promise<ChatDto> {
    const avatarUrl = await client.resolveAvatar(chat.id._serialized, resolveImmediately);
    return {
        archived: chat.archived,
        id: new ChatIdDto(chat.id),
        isGroup: chat.isGroup,
        name: chat.name,
        // Never expose the raw WhatsApp CDN URL to the client — it may be
        // signed/time-limited or otherwise require the authenticated pup
        // session to fetch correctly. Instead point at our own proxy
        // endpoint, which downloads (and decrypts if necessary) the image
        // server-side and always returns a plain, unencrypted image.
        chatAvatarUrl: avatarUrl?.avatarUrl ? `/avatar/${encodeURIComponent(chat.id._serialized)}` : null,
        unreadCount: chat.unreadCount,
        lastMessage: await lastAllowedTypeMessage(client, chat, currentUserId),
        pinned: chat.pinned,
        timestamp: chat.timestamp,
    };
}

async function toMessageDto(client: WhatsAppClientWithCache, message: Message, currentUserId: string, resolveImmediately = false): Promise<MessageDto> {
    const authorId = message.author || message.from;
    const contactInfo = await client.resolveContactInfo(authorId, resolveImmediately);
    const messageId = message.id._serialized;

    // Enrich with Prisma-backed metadata (best-effort — defaults on miss)
    const [sender, readBy, editDeleteInfo, reactionAttribution] = await Promise.all([
        getMessageSender(messageId),
        getMessageReadBy(messageId, currentUserId),
        getMessageEditDeleteInfo(messageId),
        getReactionAttribution(messageId),
    ]);

    // Fetch live reactions from WhatsApp (gated on hasReaction to avoid
    // unnecessary Puppeteer round-trips)
    let reactions: ReactionDto[] = [];
    if ((message as any).hasReaction) {
        try {
            const liveReactions = await (message as any).getReactions();
            if (liveReactions && Array.isArray(liveReactions)) {
                reactions = liveReactions.map((r: any) => {
                    const senders = (r.senders || []).map((s: any) => ({
                        name: s.senderId || "Unknown",
                    }));
                    // Merge local attribution: if our app user set this emoji,
                    // include their info
                    const localUsers: { userId?: string; name: string }[] = [];
                    if (reactionAttribution && reactionAttribution.emoji === r.aggregateEmoji) {
                        localUsers.push({
                            userId: reactionAttribution.userId,
                            name: reactionAttribution.name,
                        });
                    }
                    // Also include WhatsApp senders
                    for (const s of senders) {
                        localUsers.push({ name: s.name });
                    }

                    return {
                        emoji: r.aggregateEmoji,
                        count: r.senders ? r.senders.length : 0,
                        reactedByMe: r.hasReactionByMe || false,
                        users: localUsers,
                    };
                });
            }
        } catch (err) {
            // getReactions() can fail if the message isn't fully loaded;
            // silently fall back to empty reactions array
            console.error(`Failed to fetch reactions for message ${messageId}:`, err);
        }
    }

    // Determine if the message is deleted (WhatsApp marks revoked messages
    // with type 'revoked')
    const isRevoked = message.type === MessageTypes.REVOKED;

    return {
        id: {
            fromMe: message.id.fromMe,
            remote: message.id.remote,
            id: message.id.id,
            _serialized: message.id._serialized,
        },
        body: isRevoked ? "" : message.body,
        hasMedia: isRevoked ? false : message.hasMedia,
        type: toAllowedType(message.type),
        from: await toContactInfoDto(client, contactInfo, resolveImmediately),
        sentByUser: sender ?? { userId: '', name: '', phoneNumber: '' },
        readBy,
        timestamp: message.timestamp,
        isEdited: editDeleteInfo.isEdited,
        editedBy: editDeleteInfo.editedBy,
        isDeleted: editDeleteInfo.isDeleted || isRevoked,
        deletedBy: editDeleteInfo.deletedBy,
        reactions,
    };
}

async function toContactInfoDto(client: WhatsAppClientWithCache, contactInfo: {
    lid: string | null; pn: string | null; name: string | null
}, resolveImmediately = false): Promise<ContactInfoDto> {
    const avatarUrl = contactInfo.lid ? await client.resolveAvatar(contactInfo.lid, resolveImmediately) : null;
    // Same reasoning as toChatDto: only ever hand back our own proxy path,
    // never the raw upstream CDN URL.
    const resolvedAvatarUrl = (avatarUrl?.avatarUrl && contactInfo.lid)
        ? `/avatar/${encodeURIComponent(contactInfo.lid)}`
        : null;
    return {
        lid: contactInfo?.lid,
        pn: contactInfo?.pn,
        name: contactInfo?.name,
        avatarUrl: resolvedAvatarUrl
    };
}

// ── 0.10: Remove 'authenticated' — no branch produces it ───────────────────
export type ClientStatus =
    | 'initializing'
    | 'qr_ready'
    | 'ready'
    | 'disconnected'
    | 'auth_failure';

export interface ClientStateResponse {
    /** Raw WAState value from whatsapp-web.js (e.g. "CONNECTED", "DISCONNECTED", "UNPAIRED") */
    waState: string;
    /** Simplified client status mapped to the API's ClientStatus type */
    status: ClientStatus;
    /** Whether a QR code is available for pairing */
    qrAvailable: boolean;
    /** QR code as a PNG data URL (only present when qrAvailable is true) */
    qrDataURL: string | null;
    /** Convenience flag: true when the client is fully connected and ready */
    ready: boolean;
}

/**
 * Map a raw WAState value to the simplified ClientStatus used by the API.
 * 0.10: Handle null explicitly — don't rely on the default branch.
 */
function mapWAStateToClientStatus(state: WAState | null): ClientStatus {
    if (state === null) return 'initializing';
    switch (state) {
        case WAState.CONNECTED:
            return 'ready';
        case WAState.UNPAIRED:
        case WAState.UNPAIRED_IDLE:
        case WAState.PAIRING:
            return 'qr_ready';
        case WAState.TIMEOUT:
        case WAState.CONFLICT:
        case WAState.PROXYBLOCK:
            return 'disconnected';
        case WAState.TOS_BLOCK:
        case WAState.SMB_TOS_BLOCK:
        case WAState.DEPRECATED_VERSION:
            return 'auth_failure';
        case WAState.UNLAUNCHED:
        case WAState.OPENING:
            return 'initializing';
        default:
            return 'initializing';
    }
}

/**
 * Single-call endpoints — fetch all data in one shot, no pagination overhead.
 */
@Route('single')
@Tags('Single')
@Security('jwtAuth')
export class SingleController extends Controller {
    private client: Promise<WhatsAppClientWithCache>;

    constructor() {
        super();
        this.client = CLIENT;
    }

    // ── 0.9: Renamed from 'chats/all' to 'chats/list' ─────────────────────
    @Get('chats/list')
    async getChats(
        @Query() limit = 50,
        @Query() offset = 0,
        @Query() includeArchived = false,
        @Request() req: ExpressRequest,
    ): Promise<ChatDto[]> {
        const client = await this.client;
        const chats = await client.getChats();
        // 0.3: Sort descending by timestamp before slicing
        const sorted = chats
            .filter(chat => includeArchived || !chat.archived)
            .sort((a, b) => b.timestamp - a.timestamp);
        return await Promise.all(
            // 0.4: resolveImmediately = false for list endpoints
            sorted.slice(offset, offset + limit).map(chat => toChatDto(client, chat, req.user?.userId || '', false))
        );
    }

    @Get('chats/{id}')
    async getChatById(
        @Path() id: string,
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<ChatDto> {
        const client = await this.client;
        const chat = await client.getChatById(id);
        if (!chat) {
            return notFoundResponse(404, { message: 'Chat not found' });
        }
        return await toChatDto(client, chat, req.user?.userId || '', true);
    }

    // ── 0.7: Mark-as-read endpoint ─────────────────────────────────────────
    @Post('chats/{id}/read')
    async markAsRead(
        @Path() id: string,
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<{ success: boolean }> {
        const client = await this.client;
        const chat = await client.getChatById(id);
        if (!chat) return notFoundResponse(404, { message: 'Chat not found' });
        await chat.sendSeen();

        // Record the last 10 messages as seen by this user so the
        // readBy field is populated on subsequent fetches.
        if (req.user?.userId) {
            const messages = await chat.fetchMessages({ limit: 10 });
            await Promise.all(
                messages.map(msg =>
                    upsertMessage(msg.id._serialized, id, { body: msg.body }).then(() =>
                        markMessageSeen(req.user!.userId, msg.id._serialized, id)
                    )
                )
            );
        }

        return { success: true };
    }

    /**
     * Fetch messages for a specific chat.
     * Supports pagination via `limit` and `offset`.
     *
     * `fetchMessages` returns the most recent N messages, oldest-first.
     * Pagination counts from the newest end:
     *   - offset=0  → the most recent `limit` messages
     *   - offset=50 → the next 50 messages going back
     *
     * 0.5: Scrollback is capped at 200 messages total.
     */
    @Get('chats/{id}/messages')
    async getChatMessages(
        @Path() id: string,
        @Query() limit = 50,
        @Query() offset = 0,
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badRequest: TsoaResponse<400, { error: string }>,
    ): Promise<MessageDto[]> {
        const client = await this.client;
        const chat = await client.getChatById(id);
        if (!chat) {
            return notFoundResponse(404, { message: 'Chat not found' });
        }
        // 0.5: Reject early if scrollback exceeds 200
        if (offset + limit > 200) {
            return badRequest(400, { error: 'Scrollback is limited to 200 messages.' });
        }
        // Fetch enough messages to cover the offset + limit (counted from newest)
        const messages = await chat.fetchMessages({ limit: offset + limit });
        const end = messages.length - offset;
        const start = Math.max(0, end - limit);
        const sliced = messages
            .slice(start, end)
        const result = await Promise.all(
            // 0.4: resolveImmediately = false for list endpoints
            sliced.map(msg => toMessageDto(client, msg, req.user?.userId || '', false))
        ).then(msgs => msgs.filter(msg => msg.type !== 'unsupported')); // Return oldest-first

        // Implicitly mark fetched messages as seen by the requesting user.
        // Fire-and-forget — never block the response on DB writes.
        if (req.user?.userId) {
            const uid = req.user.userId;
            sliced.forEach(msg => {
                upsertMessage(msg.id._serialized, id, { body: msg.body }).then(() =>
                    markMessageSeen(uid, msg.id._serialized, id)
                ).catch(err => console.error('Failed to record seen message:', err));
            });
        }

        return result;
    }

    /**
     * Download media attached to a message.
     * Returns the raw binary data with the correct Content-Type header.
     * The `id` parameter is the message's serialized ID (e.g. "true_16073041892@c.us_3EB0F1F3ABC").
     *
     * 0.2: Use @Res() TsoaResponse pattern + raw res.end() to avoid TSOA's JSON serialization.
     */
    @Get('messages/{id}/media')
    @Produces('application/octet-stream')
    async downloadMedia(
        @Request() req: ExpressRequest,
        @Path() id: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badRequest: TsoaResponse<400, { error: string }>,
    ): Promise<void> {
        const client = await this.client;
        const message = await client.getMessageById(id);
        if (!message) return notFoundResponse(404, { message: 'Message not found' });
        if (!message.hasMedia) return badRequest(400, { error: 'Message has no media' });
        const media = await message.downloadMedia();
        if (!media) return notFoundResponse(404, { message: 'Media could not be downloaded' });
        const res = req.res!;
        res.setHeader('Content-Type', media.mimetype);
        if (media.filename) {
            res.setHeader('Content-Disposition', `inline; filename="${media.filename}"`);
        }
        res.end(Buffer.from(media.data, 'base64'));
    }

    /**
     * Serve a contact/chat's avatar as raw, unencrypted image bytes.
     *
     * We intentionally never hand the raw WhatsApp CDN URL (pps.whatsapp.net /
     * mmg.whatsapp.net, etc.) back to the browser. Those URLs:
     *   - are signed and time-limited (`oe`/`oh` query params expire),
     *   - are sometimes served with misleading headers
     *     (e.g. `Content-Disposition: attachment; filename=file.enc`),
     *   - and, for actual message media, are AES-encrypted and require the
     *     mediaKey to decrypt.
     *
     * Since the API container already has an authenticated puppeteer/WhatsApp
     * Web session, we fetch the image server-side here and stream back plain
     * image bytes with a correct Content-Type — the client never talks to
     * WhatsApp's CDN directly.
     */
    @Get('avatar/{contactId}')
    @Produces('image/jpeg')
    async getAvatar(
        @Request() req: ExpressRequest,
        @Path() contactId: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badGatewayResponse: TsoaResponse<502, { message: string }>,
    ): Promise<void> {
        const client = await this.client;

        // Check local cache first
        if (client.hasLocalAvatar(contactId)) {
            const filePath = client.getLocalAvatarPath(contactId);
            try {
                const data = await fs.promises.readFile(filePath);
                const res = req.res!;
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'private, max-age=31536000');
                res.end(data);
                return;
            } catch (err) {
                console.error(`Failed to read local avatar for ${contactId}:`, err);
            }
        }

        const avatarResult = await client.resolveAvatar(contactId);
        if (!avatarResult?.avatarUrl) {
            return notFoundResponse(404, { message: 'Avatar not found' });
        }

        let upstream: Response;
        try {
            upstream = await fetch(avatarResult.avatarUrl);
        } catch (error) {
            console.error(`Failed to fetch avatar for ${contactId}:`, error);
            return badGatewayResponse(502, { message: 'Failed to fetch avatar' });
        }

        if (!upstream.ok) {
            return notFoundResponse(404, { message: 'Avatar not found' });
        }

        const contentType = upstream.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await upstream.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save to local cache
        try {
            const filePath = client.getLocalAvatarPath(contactId);
            await fs.promises.writeFile(filePath, buffer);
        } catch (err) {
            console.error(`Failed to save local avatar for ${contactId}:`, err);
        }

        const res = req.res!;
        res.setHeader('Content-Type', contentType);
        // No Content-Disposition here — this must always render inline as an
        // image, never trigger a download or be mislabeled as an .enc file.
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.end(buffer);
    }

    @Post('contacts/info')
    async getContactInformation(
        @Body() contactIds: string[],
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<ContactInfoDto[]> {
        const client = await this.client;
        const contactInfoResults = await Promise.all(contactIds.map(id => client.resolveContactInfo(id, true)));
        return await Promise.all(contactInfoResults.map(info => toContactInfoDto(client, info, true)));
    }

    @Post('messages/send-text')
    async sendMessage(
        @Body() request: {
            chatId: string;
            message: string;
        },
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<MessageDto> {
        const client = await this.client;
        const messageResult = await client.sendMessage(request.chatId, request.message);
        if (!messageResult) {
            return notFoundResponse(404, { message: 'Message not sent' });
        }

        // Persist to database — attribute to sender and mark as seen by them
        const messageId = messageResult.id._serialized;
        await upsertMessage(messageId, request.chatId, { body: request.message });
        if (req.user?.userId) {
            await Promise.all([
                markMessageSent(req.user.userId, messageId, request.chatId),
                markMessageSeen(req.user.userId, messageId, request.chatId),
            ]);
        }

        return toMessageDto(client, messageResult, req.user?.userId || '', true);
    }

    @Post('messages/{chatId}/send-media')
    async sendMedia(
        @Path() chatId: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<MessageDto> {
        const client = await this.client;
        const media = new MessageMedia(
            file.mimetype,
            file.buffer.toString('base64'),
            file.originalname
        );
        const messageResult = await client.sendMessage(chatId, media);
        if (!messageResult) {
            return notFoundResponse(404, { message: 'Media not sent' });
        }

        // Persist to database — attribute to sender and mark as seen by them
        const messageId = messageResult.id._serialized;
        await upsertMessage(messageId, chatId, { mediaMime: file.mimetype, fileName: file.originalname });
        if (req.user?.userId) {
            await Promise.all([
                markMessageSent(req.user.userId, messageId, chatId),
                markMessageSeen(req.user.userId, messageId, chatId),
            ]);
        }

        return toMessageDto(client, messageResult, req.user?.userId || '', true);
    }

    // ── Message edit endpoint ──────────────────────────────────────────────
    /**
     * Edit a previously-sent message.
     * Only messages sent by the current WhatsApp identity (fromMe) can be edited.
     * The previous state is logged to MessageLog before the edit is applied.
     */
    @Post('messages/{id}/edit')
    async editMessage(
        @Path() id: string,
        @Body() body: { newBody: string },
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() forbiddenResponse: TsoaResponse<403, { message: string }>,
    ): Promise<MessageDto> {
        const client = await this.client;
        const message = await client.getMessageById(id);
        if (!message) {
            return notFoundResponse(404, { message: 'Message not found' });
        }
        if (!message.fromMe) {
            return forbiddenResponse(403, { message: 'Can only edit your own messages' });
        }

        const chatId = message.id.remote;

        // Snapshot the current state before editing
        const previousData = {
            body: message.body,
            type: message.type,
            hasMedia: message.hasMedia,
            timestamp: message.timestamp,
        };

        // Log the change for audit/attribution
        if (req.user?.userId) {
            await logMessageChange("EDIT", id, chatId, req.user.userId, previousData, body.newBody);
        }

        // Apply the edit via WhatsApp
        await message.edit(body.newBody);

        // Upsert the new state
        await upsertMessage(id, chatId, { body: body.newBody });

        // Re-fetch the message to get the updated state
        const updatedMessage = await client.getMessageById(id);
        if (!updatedMessage) {
            return notFoundResponse(404, { message: 'Message not found after edit' });
        }

        return toMessageDto(client, updatedMessage, req.user?.userId || '', true);
    }

    // ── Message delete endpoint ────────────────────────────────────────────
    /**
     * Delete a message for everyone.
     * Only messages sent by the current WhatsApp identity (fromMe) can be deleted.
     * The previous state is logged to MessageLog before the delete is applied.
     */
    @Post('messages/{id}/delete')
    async deleteMessage(
        @Path() id: string,
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() forbiddenResponse: TsoaResponse<403, { message: string }>,
    ): Promise<MessageDto> {
        const client = await this.client;
        const message = await client.getMessageById(id);
        if (!message) {
            return notFoundResponse(404, { message: 'Message not found' });
        }
        if (!message.fromMe) {
            return forbiddenResponse(403, { message: 'Can only delete your own messages' });
        }

        const chatId = message.id.remote;

        // Snapshot the current state before deleting
        const previousData = {
            body: message.body,
            type: message.type,
            hasMedia: message.hasMedia,
            timestamp: message.timestamp,
        };

        // Log the change for audit/attribution
        if (req.user?.userId) {
            await logMessageChange("DELETE", id, chatId, req.user.userId, previousData);
        }

        // Delete for everyone via WhatsApp
        await message.delete(true);

        // Upsert the revoked state
        await upsertMessage(id, chatId, { body: "", type: "revoked", hasMedia: false });

        // Re-fetch the message to get the updated (revoked) state
        const updatedMessage = await client.getMessageById(id);
        if (!updatedMessage) {
            return notFoundResponse(404, { message: 'Message not found after delete' });
        }

        return toMessageDto(client, updatedMessage, req.user?.userId || '', true);
    }

    // ── Message react endpoint ─────────────────────────────────────────────
    /**
     * React to a message with an emoji.
     * Send an empty string to remove the reaction.
     * Works on any message (own or received).
     */
    @Post('messages/{id}/react')
    async reactToMessage(
        @Path() id: string,
        @Body() body: { emoji: string },
        @Request() req: ExpressRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<MessageDto> {
        const client = await this.client;
        const message = await client.getMessageById(id);
        if (!message) {
            return notFoundResponse(404, { message: 'Message not found' });
        }

        const chatId = message.id.remote;

        // Persist the reaction attribution locally
        if (req.user?.userId) {
            await setMessageReaction(req.user.userId, id, chatId, body.emoji);
        }

        // Mirror the reaction to WhatsApp
        await message.react(body.emoji);

        // Re-fetch the message to get the updated state
        const updatedMessage = await client.getMessageById(id);
        if (!updatedMessage) {
            return notFoundResponse(404, { message: 'Message not found after react' });
        }

        return toMessageDto(client, updatedMessage, req.user?.userId || '', true);
    }

    // ── 0.6: Return whatsappId in check response ───────────────────────────
    @Get('check')
    async checkPhone(
        @Query() phone: string,
        @Res() badRequest: TsoaResponse<400, { error: string }>,
        @Res() serviceUnavailable: TsoaResponse<503, { error: string; retryAfterSeconds: number }>,
    ): Promise<{
        phone: string;
        whatsappId: string | null;
        contactInfo: ContactInfoDto | null;
        registered: boolean;
    }> {
        const client = await this.client;
        const digits = phone.replace(/\D/g, '');
        if (!digits) {
            return badRequest(400, { error: '`phone` must contain at least one digit.' });
        }

        const hasCountryCode = phone.trim().startsWith('+') || digits.length >= 11;
        let candidates: string[];
        if (hasCountryCode) {
            candidates = [digits];
            // Mexico: toggle mobile prefix "1" after country code "52"
            if (digits.startsWith('521') && digits.length === 13) {
                // 5218681137923 → also try 528681137923 (landline format)
                candidates.push('52' + digits.slice(3));
            } else if (digits.startsWith('52') && !digits.startsWith('521') && digits.length === 12) {
                // 528681137923 → also try 5218681137923 (mobile format)
                candidates.push('521' + digits.slice(2));
            }
        } else {
            // No country code detected — try common prefixes
            candidates = [
                `1${digits}`,      // US/Canada
                `521${digits}`,    // Mexico mobile
                `52${digits}`,     // Mexico landline
            ];
        }

        try {
            const results = await Promise.all(
                candidates.map(async (num) => {
                    const whatsappId = `${num}@c.us`;
                    const contactInfo = await client.resolveContactInfo(whatsappId, true);
                    return { whatsappId, contactInfo };
                }),
            );

            const match = results.find((r) => r.contactInfo.lid !== null);
            return {
                phone,
                whatsappId: match?.whatsappId ?? null,
                contactInfo: match ? await toContactInfoDto(client, match.contactInfo, true) : null,
                registered: match !== undefined,
            };
        } catch (err: any) {
            return serviceUnavailable(503, {
                error: err?.message ?? 'WhatsApp client not ready',
                retryAfterSeconds: 10,
            });
        }
    }
}

@Route('single')
@Tags('Single')
export class StateController extends Controller {
    private client: Promise<WhatsAppClientWithCache>;

    constructor() {
        super();
        this.client = CLIENT;
    }

    @Get('client/state')
    async getState(): Promise<ClientStateResponse> {
        const client = await this.client;
        try {
            const state = await client.getState();
            const isQrState = state === WAState.UNPAIRED || state === WAState.UNPAIRED_IDLE || state === WAState.PAIRING;
            return {
                waState: state,
                status: mapWAStateToClientStatus(state),
                qrAvailable: isQrState,
                qrDataURL: isQrState ? client.qrDataURL : null,
                ready: state === WAState.CONNECTED,
            };
        } catch (error) {
            return {
                waState: 'UNKNOWN',
                status: 'initializing',
                qrAvailable: false,
                qrDataURL: null,
                ready: false,
            };
        }
    }
}
