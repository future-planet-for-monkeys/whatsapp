import { readFileSync } from "node:fs";

// ── Configuration ────────────────────────────────────────────────────────────

function loadConfig() {
  const apiBaseUrl = process.env.WHATSAPP_API_BASE_URL || "http://localhost:3000";
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const basicUsername = process.env.WHATSAPP_BASIC_AUTH_USERNAME;
  const basicPassword = process.env.WHATSAPP_BASIC_AUTH_PASSWORD;

  // Build the Authorization header — prefer token if available, else Basic
  let authHeader: string | null = null;
  if (apiToken) {
    authHeader = apiToken; // sent as X-Api-Token
  } else if (basicUsername && basicPassword) {
    const encoded = Buffer.from(`${basicUsername}:${basicPassword}`).toString("base64");
    authHeader = `Basic ${encoded}`; // sent as Authorization
  }

  if (!authHeader) {
    console.error(
      "[whatsapp-mcp] No auth configured. Set WHATSAPP_API_TOKEN or WHATSAPP_BASIC_AUTH_USERNAME / WHATSAPP_BASIC_AUTH_PASSWORD."
    );
    process.exit(1);
  }

  return { apiBaseUrl, authHeader: authHeader!, useToken: !!apiToken };
}

const CONFIG = loadConfig();

// ── Type helpers ─────────────────────────────────────────────────────────────

interface ApiError {
  error?: string;
  message?: string;
  details?: unknown;
}

// ── Shared fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${CONFIG.apiBaseUrl}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (CONFIG.useToken) {
    headers["X-Api-Token"] = CONFIG.authHeader;
  } else {
    headers["Authorization"] = CONFIG.authHeader;
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  // Handle 404 specifically
  if (res.status === 404) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    throw new WhatsAppApiError(body.message || body.error || "Not found", 404);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    throw new WhatsAppApiError(
      body.error || body.message || `HTTP ${res.status}`,
      res.status
    );
  }

  // 204 No Content or empty body
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}

// ── DTO types (mirrors SingleController) ─────────────────────────────────────

export interface ChatIdDto {
  id: string;
  server: string;
  user: string;
  _serialized: string;
}

export interface MessageIdDto {
  fromMe: boolean;
  remote: string;
  id: string;
  _serialized: string;
}

export interface ContactInfoDto {
  lid: string | null;
  pn: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export type AllowedMessageTypes =
  | "chat"
  | "image"
  | "video"
  | "audio"
  | "ptt"
  | "document"
  | "sticker"
  | "unsupported";

export interface MessageDto {
  id: MessageIdDto;
  body: string;
  hasMedia: boolean;
  type: AllowedMessageTypes;
  from: ContactInfoDto;
  timestamp: number;
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
  timestamp: number;
}

export interface ClientStateResponse {
  waState: string;
  status: "initializing" | "qr_ready" | "ready" | "disconnected" | "auth_failure";
  qrAvailable: boolean;
  qrDataURL: string | null;
  ready: boolean;
}

// ── API methods ──────────────────────────────────────────────────────────────

/** List chats, newest first. */
export async function listChats(params?: {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}): Promise<ChatDto[]> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  if (params?.includeArchived) qs.set("includeArchived", "true");
  const query = qs.toString();
  return apiFetch<ChatDto[]>(`/single/chats/list${query ? `?${query}` : ""}`);
}

/** Get a single chat by its serialized ID. */
export async function getChat(id: string): Promise<ChatDto | null> {
  try {
    return await apiFetch<ChatDto>(`/single/chats/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof WhatsAppApiError && e.status === 404) return null;
    throw e;
  }
}

/** Mark all messages in a chat as read. */
export async function markChatAsRead(id: string): Promise<boolean> {
  try {
    const result = await apiFetch<{ success: boolean }>(
      `/single/chats/${encodeURIComponent(id)}/read`,
      { method: "POST" }
    );
    return result.success;
  } catch (e) {
    if (e instanceof WhatsAppApiError && e.status === 404) return false;
    throw e;
  }
}

/** Get messages for a chat. Limited to 200 total scrollback. */
export async function getChatMessages(
  chatId: string,
  params?: { limit?: number; offset?: number }
): Promise<MessageDto[]> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return apiFetch<MessageDto[]>(
    `/single/chats/${encodeURIComponent(chatId)}/messages${query ? `?${query}` : ""}`
  );
}

/** Send a text message to a chat. Returns the sent message. */
export async function sendTextMessage(
  chatId: string,
  message: string
): Promise<MessageDto> {
  return apiFetch<MessageDto>("/single/messages/send-text", {
    method: "POST",
    body: JSON.stringify({ chatId, message }),
  });
}

/** Send media (image, video, document, etc.) to a chat. */
export async function sendMediaMessage(
  chatId: string,
  filePath: string,
  mimeType?: string
): Promise<MessageDto> {
  const fileBuffer = readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType || "application/octet-stream" });
  const formData = new FormData();
  const fileName = filePath.split("/").pop() || "file";
  formData.append("file", blob, fileName);

  const url = `${CONFIG.apiBaseUrl}/single/messages/${encodeURIComponent(chatId)}/send-media`;

  const headers: Record<string, string> = {};
  if (CONFIG.useToken) {
    headers["X-Api-Token"] = CONFIG.authHeader;
  } else {
    headers["Authorization"] = CONFIG.authHeader;
  }
  // Don't set Content-Type — fetch sets it automatically with boundary for FormData

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    throw new WhatsAppApiError(
      body.error || body.message || `HTTP ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<MessageDto>;
}

/** Get raw media bytes + mime type for a message attachment. */
export async function downloadMedia(
  messageId: string
): Promise<{ data: Buffer; mimeType: string; filename: string | null } | null> {
  const url = `${CONFIG.apiBaseUrl}/single/messages/${encodeURIComponent(messageId)}/media`;

  const headers: Record<string, string> = {};
  if (CONFIG.useToken) {
    headers["X-Api-Token"] = CONFIG.authHeader;
  } else {
    headers["Authorization"] = CONFIG.authHeader;
  }

  const res = await fetch(url, { headers });

  if (res.status === 404 || res.status === 400) {
    return null;
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    throw new WhatsAppApiError(
      body.error || body.message || `HTTP ${res.status}`,
      res.status
    );
  }

  const mimeType = res.headers.get("content-type") || "application/octet-stream";
  const disposition = res.headers.get("content-disposition");
  let filename: string | null = null;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }

  const arrayBuffer = await res.arrayBuffer();
  return { data: Buffer.from(arrayBuffer), mimeType, filename };
}

/** Get the current WhatsApp client connection state. */
export async function getClientState(): Promise<ClientStateResponse> {
  return apiFetch<ClientStateResponse>("/single/client/state");
}

/** Get contact info for one or more WhatsApp IDs. */
export async function getContactInfo(contactIds: string[]): Promise<ContactInfoDto[]> {
  return apiFetch<ContactInfoDto[]>("/single/contacts/info", {
    method: "POST",
    body: JSON.stringify(contactIds),
  });
}

/** Check if a phone number is registered on WhatsApp. */
export async function checkPhone(phone: string): Promise<{
  phone: string;
  whatsappId: string | null;
  contactInfo: ContactInfoDto | null;
  registered: boolean;
}> {
  return apiFetch(`/single/check?phone=${encodeURIComponent(phone)}`);
}

/** Get avatar image as base64 data URL for a contact/chat. */
export async function getAvatar(
  contactId: string
): Promise<{ dataURL: string; mimeType: string } | null> {
  const url = `${CONFIG.apiBaseUrl}/single/avatar/${encodeURIComponent(contactId)}`;

  const headers: Record<string, string> = {};
  if (CONFIG.useToken) {
    headers["X-Api-Token"] = CONFIG.authHeader;
  } else {
    headers["Authorization"] = CONFIG.authHeader;
  }

  const res = await fetch(url, { headers });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    throw new WhatsAppApiError(
      body.error || body.message || `HTTP ${res.status}`,
      res.status
    );
  }

  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { dataURL: `data:${mimeType};base64,${base64}`, mimeType };
}
