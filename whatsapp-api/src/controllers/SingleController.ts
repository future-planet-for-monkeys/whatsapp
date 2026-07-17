import { Controller, Get, Query, Route, Tags, Security, Res, type TsoaResponse, Path, Post, Body, UploadedFile } from "tsoa";
import { type Chat, ChatId, Client, Message, MessageId, MessageMedia, MessageTypes, WAState } from "whatsapp-web.js";
import { CLIENT } from "../client";
import { WhatsAppClientWithCache } from "../services/WhatsAppService.v2";

type AllowedMessageTypes =
    | MessageTypes.TEXT
    | MessageTypes.IMAGE
    | MessageTypes.VIDEO
    | MessageTypes.AUDIO
    | MessageTypes.DOCUMENT;

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
    unreadCount: number;
    lastMessage: MessageDto | null;
    pinned: boolean;
}

export interface MessageIdDto {
    fromMe: boolean;
    remote: string;
    id: string;
    _serialized: string;
}

export interface MessageDto {
    id: MessageIdDto;
    body: string;
    hasMedia: boolean;
    type: AllowedMessageTypes;
    from: ContactInfoDto;
    /** Unix epoch seconds */
    timestamp: number;
}

export interface ContactInfoDto {
    lid: string | null;
    pn: string | null;
    name: string | null;
    avatarUrl: string | null;
}


async function toChatDto(client: WhatsAppClientWithCache, chat: Chat, resolveImmediately = false): Promise<ChatDto> {
    return {
        archived: chat.archived,
        id: new ChatIdDto(chat.id),
        isGroup: chat.isGroup,
        name: chat.name,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage ? await toMessageDto(client, chat.lastMessage, resolveImmediately) : null,
        pinned: chat.pinned,
    };
}

async function toMessageDto(client: WhatsAppClientWithCache, message: Message, resolveImmediately = false): Promise<MessageDto> {
    const authorId = message.author || message.from;
    const contactInfo = await client.resolveContactInfo(authorId, resolveImmediately);
    return {
        id: {
            fromMe: message.id.fromMe,
            remote: message.id.remote,
            id: message.id.id,
            _serialized: message.id._serialized,
        },
        body: message.body,
        hasMedia: message.hasMedia,
        type: message.type as AllowedMessageTypes,
        from: await toContactInfoDto(client, contactInfo, resolveImmediately),
        timestamp: message.timestamp,
    };
}

async function toContactInfoDto(client: WhatsAppClientWithCache, contactInfo: {
    lid: string | null; pn: string | null; name: string | null
}, resolveImmediately = false): Promise<ContactInfoDto> {
    const avatarUrl = contactInfo.lid ? await client.resolveAvatar(contactInfo.lid, resolveImmediately) : null;
    return {
        lid: contactInfo?.lid,
        pn: contactInfo?.pn,
        name: contactInfo?.name,
        avatarUrl: avatarUrl?.avatarUrl || null
    };
}

export type ClientStatus =
  | 'initializing'
  | 'qr_ready'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'auth_failure';

/**
 * Map a raw WAState value to the simplified ClientStatus used by the API.
 */
function mapWAStateToClientStatus(state: WAState): ClientStatus {
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
 * Parse a message serialized ID (e.g. "true_16073041892@c.us_3EB0F1F3ABC")
 * into its components: fromMe, remote (chat ID), and the message-specific ID.
 */
function parseMessageId(serialized: string): { fromMe: boolean; remote: string; id: string } | null {
    // Format: {fromMe}_{remote}_{id}
    // fromMe is always "true" or "false"
    const match = serialized.match(/^(true|false)_(.+)_(.+)$/);
    if (!match) return null;
    return {
        fromMe: match[1] === 'true',
        remote: match[2],
        id: match[3],
    };
}

/**
 * Single-call endpoints — fetch all data in one shot, no pagination overhead.
 */
@Route('single')
@Tags('Single')
export class SingleController extends Controller {
    private client: Promise<WhatsAppClientWithCache>;

    constructor() {
        super();
        this.client = CLIENT;
    }

    @Get('chats/all')
    async getChats(
        @Query() limit = 50,
        @Query() offset = 0,
    ): Promise<ChatDto[]> {
        const client = await this.client;
        const chats = await client.getChats();
        return await Promise.all(
            chats.slice(offset, offset + limit)
                .map(chat => toChatDto(client, chat, true))
        );
    }

    @Get('chats/{id}')
    async getChatById(
        @Path() id: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<ChatDto> {
        const client = await this.client;
        const chat = await client.getChatById(id);
        if (!chat) {
            return notFoundResponse(404, { message: 'Chat not found' });
        }
        return await toChatDto(client, chat, true);
    }

    /**
     * Fetch messages for a specific chat.
     * Supports pagination via `limit` and `offset`.
     */
    @Get('chats/{id}/messages')
    async getChatMessages(
        @Path() id: string,
        @Query() limit = 50,
        @Query() offset = 0,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<MessageDto[]> {
        const client = await this.client;
        const chat = await client.getChatById(id);
        if (!chat) {
            return notFoundResponse(404, { message: 'Chat not found' });
        }
        // Fetch enough messages to cover the offset + limit
        const messages = await chat.fetchMessages({ limit: offset + limit });
        const sliced = messages.slice(offset, offset + limit);
        return await Promise.all(
            sliced.map(msg => toMessageDto(client, msg, true))
        );
    }

    /**
     * Download media attached to a message.
     * Returns the raw binary data with the correct Content-Type header.
     * The `id` parameter is the message's serialized ID (e.g. "true_16073041892@c.us_3EB0F1F3ABC").
     */
    @Get('messages/{id}/media')
    async downloadMedia(
        @Path() id: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badRequest: TsoaResponse<400, { error: string }>,
    ): Promise<Buffer> {
        const client = await this.client;

        // Parse the serialized message ID to extract the chat remote
        const parsed = parseMessageId(id);
        if (!parsed) {
            return badRequest(400, { error: 'Invalid message ID format. Expected: {fromMe}_{remote}_{id}' });
        }

        // Get the chat and find the message
        const chat = await client.getChatById(parsed.remote);
        if (!chat) {
            return notFoundResponse(404, { message: 'Chat not found for this message' });
        }

        // Fetch recent messages and find the one matching our ID
        const messages = await chat.fetchMessages({ limit: 100 });
        const message = messages.find(m => m.id._serialized === id || m.id.id === parsed.id);
        if (!message) {
            return notFoundResponse(404, { message: 'Message not found' });
        }

        if (!message.hasMedia) {
            return badRequest(400, { error: 'Message has no media' });
        }

        const media = await message.downloadMedia();
        if (!media) {
            return notFoundResponse(404, { message: 'Media not available or could not be downloaded' });
        }

        this.setHeader('Content-Type', media.mimetype);
        if (media.filename) {
            this.setHeader('Content-Disposition', `attachment; filename="${media.filename}"`);
        }
        return Buffer.from(media.data, 'base64');
    }

    /**
     * Get the current WhatsApp client connection state.
     * Returns the raw WAState value along with a simplified status and readiness flag.
     */
    @Get('client/state')
    async getClientState(): Promise<{
        /** Raw WAState value from whatsapp-web.js (e.g. "CONNECTED", "DISCONNECTED", "UNPAIRED") */
        waState: string;
        /** Simplified client status mapped to the API's ClientStatus type */
        status: ClientStatus;
        /** Whether a QR code is available for pairing */
        qrAvailable: boolean;
        /** Convenience flag: true when the client is fully connected and ready */
        ready: boolean;
    }> {
        const client = await this.client;
        try {
            const state = await client.getState();
            return {
                waState: state,
                status: mapWAStateToClientStatus(state),
                qrAvailable: state === WAState.UNPAIRED || state === WAState.UNPAIRED_IDLE || state === WAState.PAIRING,
                ready: state === WAState.CONNECTED,
            };
        } catch (error) {
            return {
                waState: 'UNKNOWN',
                status: 'initializing',
                qrAvailable: false,
                ready: false,
            };
        }
    }

    @Get('avatar/{contactId}')
    async getAvatar(
        @Path() contactId: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<string> {
        const client = await this.client;
        const avatarResult = await client.resolveAvatar(contactId, true, true);
        if (!avatarResult?.avatarUrl) {
            return notFoundResponse(404, { message: 'Avatar not found' });
        }
        return avatarResult.avatarUrl;
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
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    ): Promise<MessageDto> {
        const client = await this.client;
        const messageResult = await client.sendMessage(request.chatId, request.message);
        if (!messageResult) {
            return notFoundResponse(404, { message: 'Message not sent' });
        }
        const contactInfo = await client.resolveContactInfo(messageResult.from, true);
        return {
            ...messageResult,
            from: await toContactInfoDto(client, contactInfo, true),
            type: messageResult.type as AllowedMessageTypes,
        };
    }

    @Post('messages/{chatId}/send-media')
    async sendMedia(
        @Path() chatId: string,
        @UploadedFile() file: Express.Multer.File,
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
        const contactInfo = await client.resolveContactInfo(messageResult.from, true);
        return {
            ...messageResult,
            from: await toContactInfoDto(client, contactInfo, true),
            type: messageResult.type as AllowedMessageTypes,
        };
    }

    @Get('check')
    async checkPhone(
        @Query() phone: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badRequest: TsoaResponse<400, { error: string }>,
        @Res() serviceUnavailable: TsoaResponse<503, { error: string; retryAfterSeconds: number }>,
    ): Promise<{
        phone: string;
        contactInfo: ContactInfoDto | null;
        registered: boolean;
    }> {
        const client = await this.client;
        const digits = phone.replace(/\D/g, '');
        if (!digits) {
            return badRequest(400, { error: '`phone` must contain at least one digit.' });
        }

        const hasCountryCode = phone.trim().startsWith('+') || digits.length >= 11;
        const candidates = hasCountryCode ? [digits] : [`1${digits}`, `52${digits}`];

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
