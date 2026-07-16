// ---------------------------------------------------------------------------
// Shared response + domain types used by controllers and the WhatsApp service.
// These are the TypeScript interfaces tsoa uses to generate OpenAPI schemas.
// ---------------------------------------------------------------------------

// ── Session state ────────────────────────────────────────────────────────────

export type ClientStatus =
  | 'initializing'
  | 'qr_ready'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'auth_failure';

/** GET /status response */
export interface StatusResponse {
  /** Current lifecycle state of the WhatsApp client */
  status: ClientStatus;
  /** Whether a QR code PNG is available at GET /qr */
  qrAvailable: boolean;
  /** Convenience flag: true only when status === "ready" */
  ready: boolean;
}

/** GET /health response */
export interface HealthResponse {
  ok: boolean;
  whatsapp: ClientStatus;
  /** ISO-8601 UTC timestamp */
  ts: string;
}

/** GET /qr?format=json response */
export interface QrJsonResponse {
  /** Base64 data-URL, e.g. "data:image/png;base64,..." */
  qr: string;
}

// ── Chats ────────────────────────────────────────────────────────────────────

export interface LastMessage {
  body: string;
  type: string;
  /** Unix epoch seconds */
  timestamp: number;
  fromMe: boolean;
}

export interface ChatItem {
  /** WhatsApp chat ID, e.g. "16073041892@c.us" or "123456789@g.us" */
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  /** Unix epoch seconds of last activity */
  timestamp: number;
  lastMessage: LastMessage | null;
}

export interface ChatsResponse {
  count: number;
  chats: ChatItem[];
  /** True when more chats exist beyond the current page */
  hasMore: boolean;
}

// ── Messages ─────────────────────────────────────────────────────────────────

export interface MessageItem {
  /** Serialised message ID */
  id: string;
  from: string;
  to: string;
  body: string;
  type: string;
  /** Unix epoch seconds */
  timestamp: number;
  fromMe: boolean;
  hasMedia: boolean;
  /** Present for group messages; null otherwise */
  author: string | null;
  /** MIME type of attached media — only present when hasMedia is true */
  mimeType?: string;
  /** Original filename of attached media — only present when hasMedia is true */
  filename?: string;
}

export interface MessagesResponse {
  chatId: string;
  count: number;
  messages: MessageItem[];
  /** True when more messages exist beyond the current page */
  hasMore: boolean;
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export interface ContactItem {
  /** WhatsApp contact ID */
  id: string;
  name: string | undefined;
  pushname: string;
  shortName: string | undefined;
  number: string;
  isGroup: boolean;
  isWAContact: boolean;
  isMyContact: boolean;
}

export interface ContactsResponse {
  count: number;
  contacts: ContactItem[];
}

// ── Phone number lookup ───────────────────────────────────────────────────────

export interface PhoneCheckResult {
  /** WhatsApp chat ID that was checked, e.g. "15551234567@c.us" */
  whatsappId: string;
  /** Whether this number is registered on WhatsApp */
  registered: boolean;
}

export interface PhoneCheckResponse {
  /** Original phone input as provided */
  input: string;
  /** All candidate IDs that were checked (one if country code detected, two if not) */
  results: PhoneCheckResult[];
  /** True if ANY candidate was found on WhatsApp */
  registered: boolean;
  /** The first registered WhatsApp ID found, or null if none found */
  whatsappId: string | null;
}

// ── Save contact ─────────────────────────────────────────────────────────────

export interface SaveContactBody {
  /** Phone number in digits only (e.g. "16073041892"). Include country code. */
  phone: string;
  /** Contact's first name */
  firstName: string;
  /** Contact's last name (optional) */
  lastName?: string;
  /** If true, also sync to the phone's address book. Default false. */
  syncToAddressbook?: boolean;
}

export interface SaveContactResponse {
  ok: true;
  /** WhatsApp ID of the saved contact (e.g. "16073041892@c.us") */
  id: string;
  /** The phone number that was saved */
  phone: string;
  /** Contact's first name */
  firstName: string;
}

// ── Send text ────────────────────────────────────────────────────────────────

export interface SendMessageBody {
  /** Recipient: phone number in any format, or a WhatsApp chat/group ID */
  to: string;
  /** Plain-text message body */
  message: string;
}

export interface MessageSentResponse {
  ok: true;
  /** Serialised message ID returned by whatsapp-web.js */
  id: string;
  /** Normalised WhatsApp chat ID the message was sent to */
  to: string;
  /** Unix epoch seconds */
  timestamp: number;
}

// ── Send media ───────────────────────────────────────────────────────────────

export interface MediaSentResponse {
  ok: true;
  id: string;
  to: string;
  filename: string;
  mimeType: string;
  timestamp: number;
}

// ── Error responses (used as @Res types in controllers) ──────────────────────

export interface ErrorResponse {
  error: string;
  /** Seconds until the client is expected to be ready (503 responses only) */
  retryAfterSeconds?: number;
}

/**
 * 400 Bad Request — missing or invalid input fields.
 * Shared across controllers so tsoa sees exactly one model definition.
 */
export interface BadRequestError extends ErrorResponse {}

/**
 * 503 Service Unavailable — WhatsApp client is not in the 'ready' state.
 * Shared across controllers so tsoa sees exactly one model definition.
 */
export interface ServiceUnavailableError extends ErrorResponse {
  retryAfterSeconds: number;
}

// ── Internal error type ───────────────────────────────────────────────────────

/** Extended Error with typed codes used internally by WhatsAppService */
export interface AppError extends Error {
  code?: string;
  retryAfterSeconds?: number;
}
