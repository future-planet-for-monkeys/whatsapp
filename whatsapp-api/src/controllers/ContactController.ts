import { Controller, Get, Post, Body, Route, Tags, Security, Path, Res, type TsoaResponse } from "tsoa";
import { CLIENT } from "../client";
import { WhatsAppClientWithCache } from "../services/WhatsAppService.v2";

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface LabelDto {
    id: string;
    name: string;
    hexColor: string;
}

export interface ContactDto {
    /** WhatsApp serialized ID (e.g. "1234567890@c.us") */
    id: string;
    /** Phone number digits (e.g. "12345678901"), null if unresolvable (@lid-only) */
    phoneNumber: string | null;
    /** The contact's name as saved by the current user */
    name: string | null;
    /** The name the contact has configured to be shown publicly */
    pushname: string | null;
    /** Shortened version of name */
    shortName: string | null;
    /** Whether this number is saved in the current phone's contacts */
    isMyContact: boolean;
    /** Whether the contact is a business */
    isBusiness: boolean;
    /** Whether the contact is blocked */
    isBlocked: boolean;
    /** Whether the contact can be edited (requires resolvable phone number) */
    canEdit: boolean;
    /** Avatar URL path (our proxy endpoint) */
    avatarUrl: string | null;
}

export interface SaveContactRequest {
    firstName: string;
    lastName: string;
    /** If true, the contact will also be saved to the user's phone address book */
    syncToAddressbook: boolean;
}

export interface UpdateChatLabelsRequest {
    /** Full set of label IDs to assign to the chat (replaces existing labels) */
    labelIds: (string | number)[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the phone number for a chat ID.
 * Returns null if the contact is @lid-only (privacy-restricted, no phone number).
 */
async function resolvePhoneNumber(client: WhatsAppClientWithCache, chatId: string): Promise<string | null> {
    if (chatId.endsWith('@c.us')) {
        return chatId.split('@')[0] || null;
    }
    try {
        const info = await client.resolveContactInfo(chatId, true);
        return info.pn ?? null;
    } catch (err) {
        return null;
    }
}

async function toContactDto(
    client: WhatsAppClientWithCache,
    chatId: string,
): Promise<ContactDto> {
    let contact: any = null;
    try {
        contact = await client.getContactById(chatId);
    } catch (err) {
        console.error(`Failed to get contact by ID ${chatId}:`, err);
    }

    let phoneNumber: string | null = null;
    try {
        phoneNumber = await resolvePhoneNumber(client, chatId);
    } catch (err) {
        console.error(`Failed to resolve phone number for ${chatId}:`, err);
    }

    let avatarUrl: string | null = null;
    try {
        const avatarResult = await client.resolveAvatar(chatId, true);
        if (avatarResult?.avatarUrl) {
            avatarUrl = `/avatar/${encodeURIComponent(chatId)}`;
        }
    } catch (err) {
        console.error(`Failed to resolve avatar for ${chatId}:`, err);
    }

    return {
        id: chatId,
        phoneNumber,
        name: contact?.name ?? null,
        pushname: contact?.pushname ?? null,
        shortName: contact?.shortName ?? null,
        isMyContact: contact?.isMyContact ?? false,
        isBusiness: contact?.isBusiness ?? false,
        isBlocked: contact?.isBlocked ?? false,
        canEdit: phoneNumber !== null,
        avatarUrl,
    };
}

// ── Controller ──────────────────────────────────────────────────────────────

@Route('single')
@Tags('Contacts')
@Security('jwtAuth')
export class ContactController extends Controller {
    private client: Promise<WhatsAppClientWithCache>;

    constructor() {
        super();
        this.client = CLIENT;
    }

    /**
     * Get contact details for a chat.
     * Returns 400 for group chats (contacts are only for 1:1 chats).
     */
    @Get('contacts/{chatId}')
    async getContact(
        @Path() chatId: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badRequest: TsoaResponse<400, { message: string }>,
    ): Promise<ContactDto> {
        const client = await this.client;

        try {
            const contact = await client.getContactById(chatId);
            if (contact && contact.isGroup) {
                return badRequest(400, { message: 'Contacts are only available for 1:1 chats, not groups' });
            }
        } catch (err) {
            // If getContactById throws, it might be a valid JID that isn't in the contact list yet.
            // We can still proceed and try to resolve it.
        }

        return toContactDto(client, chatId);
    }

    /**
     * Save or edit a contact in the user's address book.
     * Requires a resolvable phone number — @lid-only contacts cannot be saved.
     */
    @Post('contacts/{chatId}/save')
    async saveContact(
        @Path() chatId: string,
        @Body() body: SaveContactRequest,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badRequest: TsoaResponse<400, { message: string }>,
    ): Promise<ContactDto> {
        const client = await this.client;

        try {
            const contact = await client.getContactById(chatId);
            if (contact && contact.isGroup) {
                return badRequest(400, { message: 'Contacts are only available for 1:1 chats, not groups' });
            }
        } catch (err) {}

        const phoneNumber = await resolvePhoneNumber(client, chatId);
        if (!phoneNumber) {
            return badRequest(400, {
                message: 'Cannot save this contact — phone number is not resolvable. This contact may be privacy-restricted (@lid-only).',
            });
        }

        await client.saveOrEditAddressbookContact(
            phoneNumber,
            body.firstName,
            body.lastName,
            body.syncToAddressbook,
        );

        // Return refreshed contact data
        return toContactDto(client, chatId);
    }

    /**
     * Delete a contact from the user's address book.
     */
    @Post('contacts/{chatId}/delete')
    async deleteContact(
        @Path() chatId: string,
        @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
        @Res() badRequest: TsoaResponse<400, { message: string }>,
    ): Promise<ContactDto> {
        const client = await this.client;

        try {
            const contact = await client.getContactById(chatId);
            if (contact && contact.isGroup) {
                return badRequest(400, { message: 'Contacts are only available for 1:1 chats, not groups' });
            }
        } catch (err) {}

        const phoneNumber = await resolvePhoneNumber(client, chatId);
        if (!phoneNumber) {
            return badRequest(400, {
                message: 'Cannot delete this contact — phone number is not resolvable.',
            });
        }

        await client.deleteAddressbookContact(phoneNumber);

        // Return refreshed contact data
        return toContactDto(client, chatId);
    }

    /**
     * Get all available Labels.
     * Returns an empty array for non-Business accounts (labels are a WhatsApp Business feature).
     */
    @Get('labels')
    async getLabels(): Promise<LabelDto[]> {
        const client = await this.client;
        try {
            const labels = await client.getLabels();
            return labels.map((l) => ({
                id: l.id,
                name: l.name,
                hexColor: l.hexColor,
            }));
        } catch {
            // Non-Business accounts throw on label operations — return empty
            return [];
        }
    }

    /**
     * Get all Labels assigned to a specific chat.
     * Returns an empty array for non-Business accounts.
     */
    @Get('chats/{chatId}/labels')
    async getChatLabels(
        @Path() chatId: string,
    ): Promise<LabelDto[]> {
        const client = await this.client;

        try {
            const labels = await client.getChatLabels(chatId);
            return labels.map((l) => ({
                id: l.id,
                name: l.name,
                hexColor: l.hexColor,
            }));
        } catch {
            return [];
        }
    }

    /**
     * Update the Labels assigned to a chat.
     * The provided labelIds replace the entire set of labels on the chat
     * (this is a full-set operation, not an add/remove toggle).
     * Returns 403 for non-Business accounts.
     */
    @Post('chats/{chatId}/labels')
    async updateChatLabels(
        @Path() chatId: string,
        @Body() body: UpdateChatLabelsRequest,
        @Res() forbiddenResponse: TsoaResponse<403, { message: string }>,
    ): Promise<LabelDto[]> {
        const client = await this.client;

        try {
            await client.addOrRemoveLabels(body.labelIds, [chatId]);
        } catch (err: any) {
            const msg = typeof err === 'string' ? err : err?.message ?? '';
            if (msg.includes('LT01') || msg.includes('Only Whatsapp business')) {
                return forbiddenResponse(403, {
                    message: 'Labels are only available on WhatsApp Business accounts.',
                });
            }
            throw err;
        }

        // Return refreshed labels
        try {
            const labels = await client.getChatLabels(chatId);
            return labels.map((l) => ({
                id: l.id,
                name: l.name,
                hexColor: l.hexColor,
            }));
        } catch {
            return [];
        }
    }
}