export interface ChatIdDto {
  id: string;
  server: string;
  user: string;
  _serialized: string;
}

export interface ContactInfoDto {
  lid: string | null;
  pn: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface MessageIdDto {
  fromMe: boolean;
  remote: string;
  id: string;
  _serialized: string;
}

// Wire values for AllowedMessageTypes — do not import from whatsapp-web.js on the frontend
export type AllowedMessageTypes =
  | 'chat'
  | 'image'
  | 'video'
  | 'audio'
  | 'ptt'
  | 'document'
  | 'sticker'
  | 'unsupported';

export interface ReactionDto {
  emoji: string;
  count: number;
  reactedByMe: boolean;
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
  };
  readBy: {
    [userId: string]: any;
    someone: boolean;
    me: boolean;
    users: { userId: string; name: string }[];
  };
  timestamp: number; // epoch seconds — multiply by 1000 for Date
  isEdited?: boolean;
  editedBy?: { userId: string; name: string } | null;
  isDeleted?: boolean;
  deletedBy?: { userId: string; name: string } | null;
  reactions?: ReactionDto[];
}

export interface ChatDto {
  archived: boolean;
  id: ChatIdDto;
  isGroup: boolean;
  chatAvatarUrl: string | null;
  name: string | null;
  unreadCount: number;
  lastMessage: MessageDto | null;
  pinned: boolean;
  timestamp: number; // added in Phase 0.3 — epoch seconds
}

// 'authenticated' is intentionally absent — no backend branch produces it
export type ClientStatus =
  | 'initializing'
  | 'qr_ready'
  | 'ready'
  | 'disconnected'
  | 'auth_failure';

export interface ClientStateResponse {
  waState: string;
  status: ClientStatus;
  qrAvailable: boolean;
  qrDataURL: string | null;
  ready: boolean;
}

export interface CheckResponse {
  phone: string;
  whatsappId: string | null; // added in Phase 0.6
  contactInfo: ContactInfoDto | null;
  registered: boolean;
}
