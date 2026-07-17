import { Client, ClientOptions, Message } from "whatsapp-web.js";
import { ClientOptionFactory } from "./ClientOptionFactory";
import QRCode from "qrcode";

interface ServiceOptions {
    cdpUrl: string;
}


export interface AvatarResolutionResult {
    avatarUrl: string | null;
    state: "resolved" | "pending";
}

export interface ContactInfoResult {
    lid: string | null;
    pn: string | null;
    name: string | null;
    state: "resolved" | "pending";
}

export class WhatsAppClientWithCache extends Client {
    /** Latest QR code as a PNG data URL, or null if not available. */
    qrDataURL: string | null = null;

    // ── Avatar cache ───────────────────────────────────────────────────────────
    private avatarCache: Map<string, { url: string | null; timestamp: number }> = new Map();
    private avatarCacheTTL: number = 5 * 60 * 1000; // 5 minutes
    private avatarResolveQueue: string[] = [];
    /** IDs already queued (or currently resolving) — prevents duplicate enqueues from concurrent callers. */
    private avatarQueuedSet: Set<string> = new Set();
    private isResolvingAvatars: boolean = false;
    private async resolveAvatarQueue(): Promise<void> {
        if (this.isResolvingAvatars) {
            return;
        }
        this.isResolvingAvatars = true;
        while (this.avatarResolveQueue.length > 0) {
            const contactId = this.avatarResolveQueue.shift()!;
            try {
                const avatarUrl = await this.getProfilePicUrl(contactId);
                console.log(`Resolved avatar for contact ${contactId}: ${avatarUrl}`);
                this.avatarCache.set(contactId, { url: avatarUrl, timestamp: Date.now() });
            } catch (error) {
                console.error(`Failed to resolve avatar for contact ${contactId}:`, error);
                this.avatarCache.set(contactId, { url: null, timestamp: Date.now() }); // Cache null to avoid repeated attempts
            } finally {
                // Only now that the cache holds a fresh entry (or null) is it safe
                // to allow this contactId to be re-queued in the future.
                this.avatarQueuedSet.delete(contactId);
            }
        }
        this.isResolvingAvatars = false;
    }

    // ── Contact info cache (lid + phone) ─────────────────────────────────────
    private contactInfoCache: Map<string, { lid: string | null; pn: string | null; name: string | null; timestamp: number }> = new Map();
    private contactInfoCacheTTL: number = 5 * 60 * 1000; // 5 minutes
    private contactInfoResolveQueue: string[] = [];
    /** IDs already queued (or currently resolving) — prevents duplicate enqueues from concurrent callers. */
    private contactInfoQueuedSet: Set<string> = new Set();
    private isResolvingContactInfo: boolean = false;

    /**
     * Background processor for the contact-info queue.
     * Drains the queue in batches because `getContactLidAndPhone` is a batch API
     * that accepts multiple IDs in a single call.
     */
    private async resolveContactInfoQueue(): Promise<void> {
        if (this.isResolvingContactInfo || this.contactInfoResolveQueue.length === 0) {
            return;
        }
        this.isResolvingContactInfo = true;
        while (this.contactInfoResolveQueue.length > 0) {
            // Take up to 50 IDs at once to avoid overly large batch calls
            const batch = this.contactInfoResolveQueue.splice(0, 50);
            let results: ({ lid?: string; pn?: string } | undefined)[] = [];
            try {
                results = await this.getContactLidAndPhone(batch);
            } catch (error) {
                console.error(`Failed to resolve lid/phone for batch:`, error);
                // Cache nulls to avoid repeated failed attempts for the whole batch
                batch.forEach(contactId => {
                    this.cacheNullContactInfo(contactId);
                    this.contactInfoQueuedSet.delete(contactId);
                });
                continue;
            }
            // Resolve each contact individually so a single bad contact
            // (e.g. one that throws "Invalid get call using deviceWid")
            // doesn't discard results for the rest of the batch.
            for (const [i, contactId] of batch.entries()) {
                try {
                    await this.fetchAndCacheSingleContactInfo(contactId, results[i]);
                } catch (error) {
                    console.error(`Failed to resolve contact info for ${contactId}:`, error);
                    this.cacheNullContactInfo(contactId);
                } finally {
                    // Only now that the cache holds a fresh entry (or null) is it safe
                    // to allow this contactId to be re-queued in the future.
                    this.contactInfoQueuedSet.delete(contactId);
                }
            }
        }
        this.isResolvingContactInfo = false;
    }

    constructor(options: ClientOptions) {
        super(options);
        // Idea, pup page evaluate queue / threads to execute comands on the 
        // client without overwhelming the pup page with too many concurrent requests.
    }

    /** Return fresh cached avatar URL, or null if missing/stale. */
    private getCachedAvatar(contactId: string): AvatarResolutionResult | null {
        if (!this.avatarCache.has(contactId)) return null;
        const cached = this.avatarCache.get(contactId)!;
        if (Date.now() - cached.timestamp < this.avatarCacheTTL) {
            return { avatarUrl: cached.url, state: "resolved" };
        }
        this.avatarCache.delete(contactId);
        return null;
    }

    /** Fetch the avatar URL for a single contact, cache it, and return the result. */
    private async fetchAndCacheAvatar(contactId: string): Promise<AvatarResolutionResult> {
        try {
            const avatarUrl = await this.getProfilePicUrl(contactId);
            console.log(`Resolved avatar for contact ${contactId}: ${avatarUrl}`);
            this.avatarCache.set(contactId, { url: avatarUrl, timestamp: Date.now() });
            return { avatarUrl, state: "resolved" };
        } catch (error) {
            console.error(`Failed to resolve avatar for contact ${contactId}:`, error);
            this.avatarCache.set(contactId, { url: null, timestamp: Date.now() });
            return { avatarUrl: null, state: "resolved" };
        }
    }

    async resolveAvatar(contactId: string, resolveImmediately = false, bustCache = false): Promise<AvatarResolutionResult> {
        if (!bustCache) {
            const cached = this.getCachedAvatar(contactId);
            if (cached) return cached;
        }

        if (resolveImmediately) {
            return this.fetchAndCacheAvatar(contactId);
        }

        // Skip enqueueing if this contactId is already queued/in-flight — avoids
        // pushing dozens of duplicate entries when many concurrent callers
        // (e.g. Promise.all over a page of messages from the same sender)
        // all miss the cache before the first resolution completes.
        if (!this.avatarQueuedSet.has(contactId)) {
            this.avatarQueuedSet.add(contactId);
            this.avatarResolveQueue.push(contactId);
            this.resolveAvatarQueue(); // Start resolving in the background
        }
        return { avatarUrl: null, state: "pending" };
    }

    /** Return fresh cached contact info, or null if missing/stale. */
    private getCachedContactInfo(contactId: string): ContactInfoResult | null {
        if (!this.contactInfoCache.has(contactId)) return null;
        const cached = this.contactInfoCache.get(contactId)!;
        if (Date.now() - cached.timestamp < this.contactInfoCacheTTL) {
            return { lid: cached.lid, pn: cached.pn, name: cached.name, state: "resolved" };
        }
        this.contactInfoCache.delete(contactId);
        return null;
    }

    /**
     * Core logic: fetch lid/phone + contact details for a single ID,
     * cache the result, and return the resolved ContactInfoResult.
     *
     * @param contactId    The contact ID to resolve.
     * @param lidPhoneResult  Pre-fetched lid/phone data (from getContactLidAndPhone).
     */
    private async fetchAndCacheSingleContactInfo(
        contactId: string,
        lidPhoneResult: { lid?: string; pn?: string } | undefined
    ): Promise<ContactInfoResult> {
        const contact = await this.getContactById(contactId);
        const entry = {
            lid: lidPhoneResult?.lid ?? null,
            pn: lidPhoneResult?.pn ?? null,
            name: contact?.pushname ?? null,
            timestamp: Date.now()
        };
        this.contactInfoCache.set(contactId, entry);
        return {
            lid: entry.lid,
            pn: entry.pn,
            name: entry.name,
            state: "resolved" as const
        };
    }

    /** Cache nulls to avoid repeated failed attempts. */
    private cacheNullContactInfo(contactId: string): void {
        this.contactInfoCache.set(contactId, {
            lid: null,
            pn: null,
            name: null,
            timestamp: Date.now()
        });
    }

    /** Fetch lid+phone for a single contact, cache the result, and return it. */
    private async fetchAndCacheContactInfo(contactId: string): Promise<ContactInfoResult> {
        try {
            const [result] = await this.getContactLidAndPhone([contactId]);
            return this.fetchAndCacheSingleContactInfo(contactId, result);
        } catch (error) {
            console.error(`Failed to resolve contact info for ${contactId}:`, error);
            this.cacheNullContactInfo(contactId);
            return { lid: null, pn: null, name: null, state: "resolved" };
        }
    }

    /**
     * Resolve contact info (lid + phone number) for a given contact ID.
     *
     * Mirrors the same cache-queue-background pattern as `resolveAvatar`.
     * Returns cached data immediately if available and fresh, otherwise
     * enqueues the ID for background resolution and returns "pending".
     */
    async resolveContactInfo(contactId: string, resolveImmediately = false): Promise<ContactInfoResult> {
        const cached = this.getCachedContactInfo(contactId);
        if (cached) return cached;

        if (resolveImmediately) {
            return this.fetchAndCacheContactInfo(contactId);
        }

        // Skip enqueueing if this contactId is already queued/in-flight — avoids
        // pushing duplicate entries when many concurrent callers all miss the
        // cache before the first resolution completes.
        if (!this.contactInfoQueuedSet.has(contactId)) {
            this.contactInfoQueuedSet.add(contactId);
            this.contactInfoResolveQueue.push(contactId);
            this.resolveContactInfoQueue(); // Start resolving in the background
        }
        return { lid: null, pn: null, name: null, state: "pending" };
    }

    
}

export class WhatsappClientFactory {
    public static async getInstance(
        options?: ServiceOptions
    ): Promise<WhatsAppClientWithCache> {
        const clientOptions: ClientOptions =
            (options?.cdpUrl)
                ? await ClientOptionFactory.getCDPClientOptions(options.cdpUrl)
                : await ClientOptionFactory.getLocalPuppeteerClientOptions();

        const client = new WhatsAppClientWithCache(clientOptions);

        // Listen for QR events and store as PNG data URL
        client.on("qr", (qr: string) => {
            QRCode.toDataURL(qr, { margin: 1 }).then((url: string) => {
                client.qrDataURL = url;
            }).catch((err: Error) => {
                console.error("[WhatsAppService] Failed to generate QR data URL:", err);
            });
        });

        // Clear QR when authenticated
        client.on("authenticated", () => {
            client.qrDataURL = null;
        });

        await client.initialize();

        return client;
    }
}
