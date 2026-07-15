import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { config } from '../config';
import type { ClientStatus, AppError } from '../types';

// Re-export so controllers can import MessageMedia from the service layer only
export { MessageMedia };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface CdpTarget {
  id: string;
  type: string;
  url: string;
  title: string;
  webSocketDebuggerUrl: string;
}

// ---------------------------------------------------------------------------
// WhatsAppService — manages a single whatsapp-web.js Client instance.
//
// Design principles:
//   • All mutable state lives on the instance — no module-level globals.
//   • The service self-heals: disconnects schedule automatic reconnects.
//   • Lifecycle quirks (hasSynced race, stale tab accumulation, SingletonLock)
//     are all encapsulated here; callers only interact with assertReady().
//   • A module-level singleton (whatsAppService) is exported for use by
//     controllers, keeping DI simple while remaining testable.
// ---------------------------------------------------------------------------
export class WhatsAppService {
  // ── State ────────────────────────────────────────────────────────────────

  private _client: Client | null = null;
  private _status: ClientStatus = 'initializing';
  private _qrDataURL: string | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _reconnectAt: number | null = null; // epoch ms when reconnect fires

  // ── Public read accessors ────────────────────────────────────────────────

  get status(): ClientStatus { return this._status; }
  get qrAvailable(): boolean { return !!this._qrDataURL; }
  get ready(): boolean { return this._status === 'ready'; }
  get qrDataURL(): string | null { return this._qrDataURL; }

  /** Seconds until the next scheduled reconnect, or 0 if none is pending. */
  get retryAfterSeconds(): number {
    if (!this._reconnectAt) return 0;
    return Math.max(0, Math.ceil((this._reconnectAt - Date.now()) / 1000));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Initialise (or reinitialise) the WhatsApp client.
   * Called once at startup and again after every disconnect / crash.
   * Never re-throws transient errors — the HTTP server stays alive.
   */
  async init(): Promise<void> {
    console.log('[whatsapp] Initialising WhatsApp client …');
    this._status = 'initializing';

    // Step 1: wait for CDP to be reachable
    const browserWSEndpoint = await this._withRetry(
      () => this._resolveCDPEndpoint(config.CHROMIUM_CDP_URL),
      'resolve CDP endpoint',
    );

    // Step 2: clean up stale WhatsApp tabs from a previous session
    const targets = await this._getCdpTargets(config.CHROMIUM_CDP_URL);
    const waTabs = targets.filter(
      (t) => t.type === 'page' && t.url.startsWith('https://web.whatsapp.com'),
    );

    if (waTabs.length > 0) {
      console.log(
        `[whatsapp] Found ${waTabs.length} existing WhatsApp tab(s) — will reuse first, close rest`,
      );
      await this._cleanupStaleWhatsAppTabs(config.CHROMIUM_CDP_URL, waTabs[0].id);
    } else {
      console.log('[whatsapp] No existing WhatsApp tabs — a fresh one will open');
    }

    // Step 3: destroy any previous client
    if (this._client) {
      try { await this._client.destroy(); } catch { /* already dead — ignore */ }
      this._client = null;
    }

    // Step 4: create new client pointing at the browser (not a specific page)
    this._client = new Client({
      authStrategy: new LocalAuth({ dataPath: config.SESSION_DATA_PATH }),
      puppeteer: {
        browserWSEndpoint,
        protocolTimeout: 30_000,
      },
    });

    this._attachEventHandlers(this._client);

    // Step 5: call initialize() — errors are caught and turned into reconnects
    try {
      console.log('[whatsapp] Calling client.initialize() …');
      await this._client.initialize();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      const isNavigationError =
        msg.includes('Execution context was destroyed') ||
        msg.includes('Session closed') ||
        msg.includes('Target closed');

      if (isNavigationError) {
        console.warn('[whatsapp] Transient navigation error during inject:', msg);
        this._status = 'disconnected';
        await this._cleanupStaleWhatsAppTabs(config.CHROMIUM_CDP_URL);
        this._scheduleReconnect(5_000);
        return;
      }

      // All other initialize() errors are treated as transient
      console.error('[whatsapp] initialize() error (will retry in 15 s):', err);
      this._status = 'disconnected';
      try { await this._client?.destroy(); } catch { /* ignore */ }
      this._client = null;
      this._scheduleReconnect(15_000);
      // Do NOT re-throw — keep the HTTP server alive
    }
  }

  // ── Route helpers ────────────────────────────────────────────────────────

  /**
   * Returns the ready Client or throws an AppError with code WA_NOT_READY.
   * Also kicks off a self-heal reconnect if the client is idle-broken.
   */
  assertReady(): Client {
    if (this._status !== 'ready' || !this._client) {
      this._triggerReconnectIfNeeded();
      const retryAfter = this.retryAfterSeconds || 10;
      const err = new Error(
        `WhatsApp client is not ready (status: ${this._status})`,
      ) as AppError;
      err.code = 'WA_NOT_READY';
      err.retryAfterSeconds = retryAfter;
      throw err;
    }
    return this._client;
  }

  /**
   * Get all WhatsApp chats using a custom implementation.
   *
   * Why not use client.getChats()?
   * The SDK's getChats() method has a serialization bug where it tries to serialize
   * complex message objects that contain circular references or non-serializable
   * properties. This causes Puppeteer to throw a cryptic "r" error when trying to
   * return the data from the browser context to Node.js.
   *
   * Our approach:
   * - Fetch chats directly from WhatsApp Web's internal collections
   * - Process each chat individually with try-catch error handling
   * - Extract only the safe, serializable properties we need
   * - Skip any problematic chats instead of failing the entire request
   */
  async getChats(): Promise<any[]> {
    const client = this.assertReady();
    const page = client.pupPage;
    
    if (!page) {
      throw new Error('Puppeteer page not available');
    }
    
    const chats = await page.evaluate(async () => {
      // Access WhatsApp Web's internal chat collection
      const chatModels = (globalThis as any).require('WAWebCollections').Chat.getModelsArray();
      const results = [];
      
      // Process each chat individually to isolate serialization errors
      for (const chat of chatModels) {
        try {
          // Build a safe, minimal representation of the chat
          // Check isGroup by looking at groupMetadata — the raw model's .isGroup
          // is always undefined; the serialized version sets it via groupMetadata
          const isGroup = !!(chat.groupMetadata);
          
          const serialized: any = {
            id: { _serialized: chat.id?._serialized || chat.id },
            name: chat.name || chat.formattedTitle || '',
            isGroup,
            unreadCount: chat.unreadCount || 0,
            timestamp: chat.t || 0,
          };
          
          // Try to add the last message if it exists
          // This is wrapped in try-catch because message objects can be problematic
          if (chat.lastReceivedKey) {
            try {
              const lastMsg = chat.msgs?.get(chat.lastReceivedKey);
              if (lastMsg) {
                // Extract only primitive, serializable properties
                serialized.lastMessage = {
                  body: lastMsg.body || '',
                  type: lastMsg.type || 'chat',
                  timestamp: lastMsg.t || 0,
                  fromMe: !!lastMsg.id?.fromMe,
                };
              }
            } catch (e) {
              // If lastMessage fails, just omit it - the chat is still valid
            }
          }
          
          results.push(serialized);
        } catch (e) {
          // If a chat can't be serialized at all, skip it and continue
          // This prevents one bad chat from breaking the entire request
        }
      }
      
      return results;
    });
    
    return chats;
  }

  /**
   * Send a plain-text message to a WhatsApp chat.
   *
   * Why not use client.sendMessage()?
   * The SDK's sendMessage() relies on WWebJS.sendMessage() which internally
   * calls addAndSendMsgToChat() and then tries to look up the sent message
   * by key via Msg.get(newMsgKey._serialized). This lookup fails silently
   * when LID migration is involved, causing sendMessage() to return null.
   *
   * Our approach:
   * - Run entirely inside page.evaluate() (browser context)
   * - Find the chat using the same pattern as getChatMessages
   * - Use the SDK's WWebJS.sendMessage() to send — but if it returns null,
   *   we look up the message ourselves by reconstructing the key from the
   *   chat's last message, which is more reliable.
   *
   * @param chatId Normalised WhatsApp chat ID (e.g. "16073041892@c.us")
   * @param message Plain-text message body
   * @returns The sent message model with id, timestamp, etc.
   */
  async sendTextMessage(chatId: string, message: string): Promise<{ id: string; to: string; timestamp: number }> {
    const client = this.assertReady();
    const page = client.pupPage;
    
    if (!page) {
      throw new Error('Puppeteer page not available');
    }

    const result = await page.evaluate(async (args: unknown) => {
      const a = args as { chatId: string; message: string };
      var WWebJS = (globalThis as any).WWebJS;
      var WAWebCollections = (globalThis as any).require('WAWebCollections');
      var WAFactory = (globalThis as any).require('WAWebWidFactory');
      var WAWebFindChatAction = (globalThis as any).require('WAWebFindChatAction');
      var WAWebSendMsgChatAction = (globalThis as any).require('WAWebSendMsgChatAction');
      var WAWebMsgKey = (globalThis as any).require('WAWebMsgKey');
      var WAWebUserPrefsMeUser = (globalThis as any).require('WAWebUserPrefsMeUser');
      
      // --- Find the chat ---
      var chatWid = WAFactory.createWid(a.chatId);
      var chat = WAWebCollections.Chat.get(chatWid);
      if (!chat) {
        try {
          var found = await WAWebFindChatAction.findOrCreateLatestChat(chatWid);
          chat = found?.chat;
        } catch (e) {}
      }
      if (!chat) {
        throw new Error('Chat not found: ' + a.chatId);
      }
      
      // --- Build the message ---
      var lidUser = WAWebUserPrefsMeUser.getMaybeMeLidUser();
      var meUser = WAWebUserPrefsMeUser.getMaybeMePnUser();
      var newId = await (globalThis as any).require('WAWebMsgKey').newId();
      var from = (typeof chat.id?.isLid === 'function' && chat.id.isLid()) ? lidUser : meUser;
      var participant;
      if (typeof chat.id?.isGroup === 'function' && chat.id.isGroup()) {
        from = chat.groupMetadata?.isLidAddressingMode ? lidUser : meUser;
        participant = WAFactory.asUserWidOrThrow(from);
      }
      
      var newMsgKey = new WAWebMsgKey({
        from: from,
        to: chat.id,
        id: newId,
        participant: participant,
        selfDir: 'out',
      });
      
      var ephemeralFields = (globalThis as any).require('WAWebGetEphemeralFieldsMsgActionsUtils').getEphemeralFields(chat);
      var message = {
        id: newMsgKey,
        ack: 0,
        body: a.message,
        from: from,
        to: chat.id,
        local: true,
        self: 'out',
        t: new Date().getTime() / 1000,
        isNewMsg: true,
        type: 'chat',
        ...ephemeralFields,
      };
      
      // --- Send the message ---
      var promises = WAWebSendMsgChatAction.addAndSendMsgToChat(chat, message);
      var msgPromise = promises[0];
      await msgPromise;
      
      // --- Retrieve the sent message ---
      // Try SDK's lookup first, then fallback to last message in chat
      var sentMsg = WAWebCollections.Msg.get(newMsgKey._serialized);
      if (!sentMsg) {
        // Fallback: get the most recent outgoing message
        var msgs = chat.msgs?.getModelsArray() || [];
        var outgoing = msgs.filter(function(m) { return m.id?.fromMe; });
        outgoing.sort(function(a, b) { return a.t > b.t ? -1 : 1; });
        sentMsg = outgoing[0];
      }
      if (!sentMsg) {
        throw new Error('Failed to send message — could not find sent message');
      }
      
      return WWebJS.getMessageModel(sentMsg);
    }, { chatId, message });
    
    // Extract the serialized message ID — the SDK's getMessageModel() returns
    // the id as a MsgKey-like object. The _serialized property may be a regular
    // property or a getter. Fall back to the $1 key (Puppeteer serialization quirk)
    // or the raw id object's own 'id' + remote + fromMe combo.
    var serializedId = result.id?._serialized || result.id?.$1 || '';
    if (!serializedId && typeof result.id === 'object') {
      // Fallback: reconstruct from components
      var fromMe = result.id.fromMe ? 'true' : 'false';
      var remote = result.id.remote || '';
      var msgId = result.id.id || '';
      var selfDir = result.id.self || 'out';
      if (remote && msgId) {
        serializedId = fromMe + '_' + remote + '_' + msgId + '_' + selfDir;
      }
    }
    
    return {
      id: serializedId || String(result.id || ''),
      to: chatId,
      timestamp: typeof result.timestamp === 'number' ? result.timestamp : (result.t || 0),
    };
  }

  /**
   * Save a new contact to the WhatsApp address book.
   *
   * Uses the SDK's saveOrEditAddressbookContact which calls
   * WAWebSaveContactAction.saveContactAction() internally.
   *
   * @param phone Phone number in digits-only format (with country code)
   * @param firstName Contact's first name
   * @param lastName Optional last name
   * @param syncToAddressbook Whether to sync to the phone's address book
   * @returns The normalised WhatsApp ID (e.g. "16073041892@c.us")
   */
  async saveContact(
    phone: string,
    firstName: string,
    lastName?: string,
    syncToAddressbook = false,
  ): Promise<string> {
    const client = this.assertReady();
    // Strip any non-digit characters just in case
    const digits = phone.replace(/\D/g, '');
    if (!digits) throw new Error('Phone number must contain at least one digit');
    
    await client.saveOrEditAddressbookContact(
      digits,
      firstName,
      lastName || '',
      syncToAddressbook,
    );
    
    return `${digits}@c.us`;
  }

  /**
   * Get messages for a specific chat using a custom implementation.
   *
   * Why not use client.getChatById() + chat.fetchMessages()?
   * The SDK's getChatById() calls WWebJS.getChat(chatId) with getAsModel=true
   * by default, which triggers chat.serialize() — a deep serialization that
   * can fail for certain chat types (e.g. LID-based contacts) with a cryptic
   * Puppeteer "r" error.
   *
   * Our approach:
   * - Access WhatsApp Web's internal collections directly via page.evaluate()
   * - Get the chat as a raw model (getAsModel: false) to avoid serialization
   * - Access the msgs collection directly from the raw model
   * - Use WWebJS.getMessageModel() for proper per-message serialization
   * - Return only the safe, serializable properties we need
   *
   * @param chatId WhatsApp chat ID (e.g. "16073041892@c.us" or "123456789@g.us")
   * @param limit  Maximum number of messages to return (1–200, default 50)
   */
  async getChatMessages(chatId: string, limit: number): Promise<any[]> {
    const client = this.assertReady();
    const page = client.pupPage;
    
    if (!page) {
      throw new Error('Puppeteer page not available');
    }

    // NOTE: No TypeScript type annotations inside page.evaluate()!
    // The code runs in the browser context where __name() doesn't exist.
    // All type annotations must be removed from the callback body.
    const messages = await page.evaluate(async (args: unknown) => {
      const a = args as { chatId: string; limit: number };
      const WAWebCollections = (globalThis as any).require('WAWebCollections');
      const WAFactory = (globalThis as any).require('WAWebWidFactory');
      const WAWebChatLoadMessages = (globalThis as any).require('WAWebChatLoadMessages');
      const WAWebFindChatAction = (globalThis as any).require('WAWebFindChatAction');
      
      // Create a Wid from the chat ID
      const chatWid = WAFactory.createWid(a.chatId);
      
      // Get the chat model directly — try local collection first, then find/create
      // This mirrors the SDK's WWebJS.getChat() approach but without serialization
      let chat = WAWebCollections.Chat.get(chatWid);
      if (!chat) {
        try {
          const found = await WAWebFindChatAction.findOrCreateLatestChat(chatWid);
          chat = found?.chat;
        } catch (e) {
          // fall through to error below
        }
      }
      if (!chat) {
        throw new Error('Chat not found: ' + a.chatId);
      }
      
      // Get messages from the chat's internal message store
      var msgs = [];
      try {
        msgs = chat.msgs?.getModelsArray() || [];
      } catch (e) {
        msgs = [];
      }
      
      // Filter out notification messages
      var filtered = msgs.filter(function(m) { return !m.isNotification; });
      
      // Sort earliest to latest
      filtered.sort(function(a, b) { return a.t > b.t ? 1 : -1; });
      
      // Load earlier messages if needed
      if (a.limit > 0) {
        while (filtered.length < a.limit) {
          try {
            var loadedMessages = await WAWebChatLoadMessages.loadEarlierMsgs({ chat: chat });
            if (!loadedMessages || !loadedMessages.length) break;
            filtered = loadedMessages.filter(function(m) { return !m.isNotification; }).concat(filtered);
          } catch (e) {
            break;
          }
        }
        
        // Trim to limit (take the most recent messages)
        if (filtered.length > a.limit) {
          filtered = filtered.splice(filtered.length - a.limit);
        }
      }
      
      // Use the SDK's own message serializer for each message
      return filtered.map(function(m) { return (globalThis as any).WWebJS.getMessageModel(m); });
    }, { chatId, limit });
    
    // Map to our API response format, extracting only safe properties
    return messages.map(function(m) {
      return {
        id: m.id?._serialized || m.id || '',
        from: m.from || '',
        to: m.to || '',
        body: m.body || '',
        type: m.type || 'chat',
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : (m.t || 0),
        fromMe: !!m.fromMe,
        hasMedia: !!m.hasMedia,
        author: m.author ?? null,
      };
    });
  }

  /**
   * Classifies an error thrown during a client operation.
   *
   * Store-not-ready errors (stores still loading after `ready`) → marks the
   * client as temporarily unavailable and asks the caller to retry in 5 s.
   *
   * Hard browser/protocol errors → destroys the client and schedules a full
   * reconnect.
   *
   * Always throws, so callers can write: `await handleOperationError(err)`.
   */
  async handleOperationError(err: unknown): Promise<never> {
    const msg = err instanceof Error ? err.message : String(err);

    // Stores still populating — don't destroy the client, just wait
    const isStoreNotReady =
      msg.includes('waitForChatLoading') ||
      (msg.includes('Cannot read properties of undefined') &&
        msg.includes('whatsapp.net'));

    if (isStoreNotReady) {
      console.warn('[whatsapp] Stores not ready yet — pausing for 5 s:', msg.split('\n')[0]);
      this._status = 'authenticated'; // block new operations temporarily
      const thisClient = this._client;
      setTimeout(() => {
        if (this._client === thisClient && this._status === 'authenticated') {
          console.log('[whatsapp] Resuming ready state after store warm-up');
          this._status = 'ready';
        }
      }, 5_000);
      const wrapped = new Error('WhatsApp client warming up — stores not ready yet') as AppError;
      wrapped.code = 'WA_NOT_READY';
      wrapped.retryAfterSeconds = 5;
      throw wrapped;
    }

    // Hard browser / protocol errors — full destroy + reconnect
    const isHardError =
      msg.includes('Execution context was destroyed') ||
      msg.includes('Session closed') ||
      msg.includes('Target closed') ||
      msg.includes('Protocol error');

    if (isHardError) {
      console.warn('[whatsapp] Hard browser error — reconnecting:', msg.split('\n')[0]);
      this._status = 'disconnected';
      try { await this._client?.destroy(); } catch { /* ignore */ }
      this._client = null;
      this._scheduleReconnect(5_000);

      const retryAfter = this.retryAfterSeconds || 5;
      const wrapped = new Error(
        `WhatsApp client error — reconnecting (status: disconnected)`,
      ) as AppError;
      wrapped.code = 'WA_NOT_READY';
      wrapped.retryAfterSeconds = retryAfter;
      throw wrapped;
    }

    throw err;
  }

  // ── Private — event wiring ────────────────────────────────────────────────

  private _attachEventHandlers(client: Client): void {
    // ── hasSynced race mitigation ─────────────────────────────────────────
    // whatsapp-web.js fires 'ready' from inside onAppStateHasSyncedEvent,
    // which it registers during inject(). With a warm service-worker cache,
    // hasSynced is already true before the listener is attached — 'ready'
    // never fires. Fix: 2 s after 'authenticated', call the exposed page
    // function directly if hasSynced is already true.
    let hasSyncedFired = false;

    client.once('authenticated', () => {
      setTimeout(async () => {
        if (this._status !== 'authenticated') return; // already moved on
        if (hasSyncedFired) return;
        try {
          const page = client.pupPage;
          if (!page) return;
          const alreadySynced = await page.evaluate(
              // globalThis === window in the browser; using globalThis avoids
              // the TypeScript "Cannot find name 'window'" error in Node context.
              () => !!(globalThis as any).AuthStore?.AppState?.hasSynced,
            );
            if (alreadySynced) {
              console.log(
                '[whatsapp] hasSynced already true — manually calling onAppStateHasSyncedEvent …',
              );
              await page.evaluate(() => {
                if (typeof (globalThis as any).onAppStateHasSyncedEvent === 'function') {
                  (globalThis as any).onAppStateHasSyncedEvent();
                }
              });
            }
        } catch (e) {
          console.warn('[whatsapp] hasSynced manual trigger failed:', e);
        }
      }, 2_000);
    });

    client.once('ready', () => { hasSyncedFired = true; });

    // ── 60 s watchdog — fallback for persistent authenticated state ───────
    // If the hasSynced fix above fails for any reason, force a full reinit.
    // 60 s gives slow connections / cold Chromium caches ample time to settle.
    let readyWatchdog: ReturnType<typeof setTimeout> | null = null;
    client.once('authenticated', () => {
      readyWatchdog = setTimeout(async () => {
        if (this._status === 'authenticated') {
          console.warn('[whatsapp] Stuck in "authenticated" > 60 s — forcing reinit …');
          this._status = 'disconnected';
          try { await client.destroy(); } catch { /* ignore */ }
          this._client = null;
          this._scheduleReconnect(2_000);
        }
      }, 60_000);
    });
    client.once('ready', () => {
      if (readyWatchdog) { clearTimeout(readyWatchdog); readyWatchdog = null; }
    });

    // ── Standard lifecycle events ─────────────────────────────────────────

    client.on('qr', async (qr) => {
      this._status = 'qr_ready';
      this._qrDataURL = await qrcode.toDataURL(qr);

      // Print QR as ASCII art to console (visible in docker logs)
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║           🔐  WHATSAPP QR CODE — SCAN TO LOGIN             ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('');
      try {
        // qrcode.toString() with 'utf8' type generates clean scannable QR
        // using Unicode half-block characters (▄▄▄ █ ▀▀▀) — no ANSI escape
        // codes, renders correctly in Docker logs.
        const qrImage = await qrcode.toString(qr, { type: 'utf8' });
        console.log(qrImage);
      } catch {
        // Fallback: log the raw QR string if generation fails
        console.log('[whatsapp] QR raw string:', qr);
      }
      console.log('');
      console.log('   📱  Open WhatsApp → Linked Devices → Link a Device');
      console.log(`   🌐  Or open http://localhost:${config.PORT}/qr in a browser`);
      console.log('');
    });

    client.on('authenticated', () => {
      console.log('[whatsapp] Session authenticated');
      this._status = 'authenticated';
      this._qrDataURL = null;
    });

    client.on('auth_failure', (msg) => {
      console.error('[whatsapp] Authentication failure:', msg);
      this._status = 'auth_failure';
      this._qrDataURL = null;
    });

    client.on('ready', () => {
      this._qrDataURL = null;
      // WhatsApp Web stores take a few extra seconds to fully populate.
      // Accepting operations too early → "Cannot read properties of undefined
      // (reading 'waitForChatLoading')". Wait 8 s for stores to settle.
      const thisClient = this._client;
      console.log('[whatsapp] ready event — warming up stores for 8 s …');
      setTimeout(() => {
        if (this._client === thisClient) {
          console.log('[whatsapp] ✅ Client fully ready');
          this._status = 'ready';
        }
      }, 8_000);
    });

    client.on('disconnected', (reason) => {
      console.warn('[whatsapp] Disconnected:', reason);
      this._status = 'disconnected';
      this._scheduleReconnect();
    });

    // ── Webhook — forward every incoming message ──────────────────────────
    client.on('message', async (msg) => {
      console.log(`[whatsapp] Incoming message from ${msg.from}`);
      await this._dispatchWebhook({
        event: 'message',
        data: {
          id: msg.id._serialized,
          from: msg.from,
          to: msg.to,
          body: msg.body,
          type: msg.type,
          timestamp: msg.timestamp,
          isGroup: msg.from.endsWith('@g.us'),
          author: msg.author ?? null,
          hasMedia: msg.hasMedia,
        },
      });
    });
  }

  // ── Private — CDP helpers ─────────────────────────────────────────────────

  /**
   * Probes the CDP HTTP endpoint and returns a WebSocket URL with the correct
   * hostname so it is reachable from within the API container.
   */
  private async _resolveCDPEndpoint(rawUrl: string): Promise<string> {
    const httpBase = rawUrl.replace(/^wss?:\/\//, 'http://').replace(/^https?:\/\//, 'http://');
    const baseNoSlash = httpBase.replace(/\/$/, '');
    const parsedProxy = new URL(httpBase);

    const versionUrl = `${baseNoSlash}/json/version`;
    console.log(`[whatsapp] Probing CDP endpoint: ${versionUrl}`);

    const resp = await fetch(versionUrl);
    if (!resp.ok) throw new Error(`CDP probe failed: ${resp.status} ${resp.statusText}`);

    const data = (await resp.json()) as { webSocketDebuggerUrl?: string };
    if (!data.webSocketDebuggerUrl) throw new Error('CDP endpoint missing webSocketDebuggerUrl');

    const wsUrl = new URL(data.webSocketDebuggerUrl);
    wsUrl.hostname = parsedProxy.hostname;
    wsUrl.port = parsedProxy.port;

    const resolved = wsUrl.toString();
    console.log(`[whatsapp] Resolved CDP endpoint: ${resolved}`);
    return resolved;
  }

  private async _getCdpTargets(rawUrl: string): Promise<CdpTarget[]> {
    const httpBase = rawUrl.replace(/^wss?:\/\//, 'http://').replace(/^https?:\/\//, 'http://');
    const baseNoSlash = httpBase.replace(/\/$/, '');
    const parsedProxy = new URL(httpBase);

    const resp = await fetch(`${baseNoSlash}/json`);
    if (!resp.ok) return [];

    const targets = (await resp.json()) as CdpTarget[];

    // Rewrite embedded localhost → proxy hostname for cross-container access
    return targets.map((t) => {
      try {
        const ws = new URL(t.webSocketDebuggerUrl);
        ws.hostname = parsedProxy.hostname;
        ws.port = parsedProxy.port;
        return { ...t, webSocketDebuggerUrl: ws.toString() };
      } catch {
        return t;
      }
    });
  }

  private async _closeCdpTarget(rawUrl: string, targetId: string): Promise<void> {
    const httpBase = rawUrl.replace(/^wss?:\/\//, 'http://').replace(/^https?:\/\//, 'http://');
    const baseNoSlash = httpBase.replace(/\/$/, '');
    try {
      await fetch(`${baseNoSlash}/json/close/${targetId}`, { method: 'GET' });
      console.log(`[whatsapp] Closed stale tab: ${targetId}`);
    } catch (err) {
      console.warn(`[whatsapp] Failed to close tab ${targetId}:`, err);
    }
  }

  /**
   * Closes all open WhatsApp page targets except keepId (if provided).
   * Prevents "another device active" warnings and unpredictable injection.
   */
  private async _cleanupStaleWhatsAppTabs(rawUrl: string, keepId?: string): Promise<number> {
    const targets = await this._getCdpTargets(rawUrl);
    const waTabs = targets.filter(
      (t) => t.type === 'page' && t.url.startsWith('https://web.whatsapp.com'),
    );
    const toClose = keepId ? waTabs.filter((t) => t.id !== keepId) : waTabs;
    for (const t of toClose) await this._closeCdpTarget(rawUrl, t.id);
    if (toClose.length > 0) {
      console.log(`[whatsapp] Cleaned up ${toClose.length} stale WhatsApp tab(s)`);
    }
    return toClose.length;
  }

  // ── Private — reconnect + retry ───────────────────────────────────────────

  /** Debounced reconnect scheduler — cancels any pending timer first. */
  private _scheduleReconnect(delayMs = 10_000): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAt = Date.now() + delayMs;
    console.log(`[whatsapp] Scheduling reconnect in ${delayMs / 1_000} s …`);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._reconnectAt = null;
      this.init().catch((err) =>
        console.error('[whatsapp] Reconnect failed:', err),
      );
    }, delayMs);
  }

  /**
   * Triggers an immediate reconnect only when the client is broken and no
   * reconnect is already in flight. Called by assertReady() so any API hit
   * self-heals the service.
   */
  private _triggerReconnectIfNeeded(): void {
    if (
      this._status === 'ready' ||
      this._status === 'initializing' ||
      this._status === 'authenticated' || // warming up — leave it
      this._reconnectTimer
    ) return;
    console.log(`[whatsapp] Self-heal: triggering reconnect (was: ${this._status})`);
    this._scheduleReconnect(3_000);
  }

  /**
   * Generic retry wrapper with exponential back-off.
   * Gives Chromium enough time to start before giving up.
   */
  private async _withRetry<T>(
    fn: () => Promise<T>,
    label: string,
    maxAttempts = 15,
    delayMs = 4_000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[whatsapp] ${label} attempt ${attempt}/${maxAttempts} failed: ${msg}`);
        if (attempt === maxAttempts) throw err;
        await new Promise<void>((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error(`${label}: exhausted retries`); // unreachable
  }

  // ── Private — webhook ─────────────────────────────────────────────────────

  private async _dispatchWebhook(payload: object): Promise<void> {
    if (!config.WEBHOOK_URL) {
      console.log('[webhook] No WEBHOOK_URL set — incoming message:', JSON.stringify(payload));
      return;
    }
    try {
      const res = await fetch(config.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`[webhook] POST failed: ${res.status} ${res.statusText}`);
      } else {
        console.log(`[webhook] Delivered to ${config.WEBHOOK_URL}`);
      }
    } catch (err) {
      console.error('[webhook] Delivery error:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton — import this everywhere instead of `new WhatsAppService()`.
// ---------------------------------------------------------------------------
export const whatsAppService = new WhatsAppService();

// ---------------------------------------------------------------------------
// Periodic watchdog — fires every 60 s to ensure self-healing even when
// no HTTP requests are coming in to trigger assertReady().
//
// States that are intentionally NOT restarted:
//   • ready        — all good
//   • initializing — startup in progress
//   • qr_ready     — waiting for the user to scan the QR code or link phone;
//                    leave it alone for as long as needed (≥ 60 s per scan)
//   • authenticated — WhatsApp stores are still warming up (60 s watchdog above)
// ---------------------------------------------------------------------------
const WATCHDOG_INTERVAL_MS = 60_000;
setInterval(() => {
  const svc = whatsAppService;
  if (
    svc.status !== 'ready' &&
    svc.status !== 'initializing' &&
    svc.status !== 'qr_ready' &&
    svc.status !== 'authenticated' &&
    svc.retryAfterSeconds === 0
  ) {
    console.warn(
      `[whatsapp] Watchdog: status is "${svc.status}" with no pending reconnect — self-healing`,
    );
    // Access private scheduling via the public init path; we call init directly
    // to avoid re-creating the timer indirection.
    svc.init().catch((err) => console.error('[whatsapp] Watchdog-triggered reinit failed:', err));
  }
}, WATCHDOG_INTERVAL_MS);
