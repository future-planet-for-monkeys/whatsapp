// ---------------------------------------------------------------------------
// UserStateService — Prisma-backed persistence for per-user read/sent/seen
// state independent of authentication logic.
//
// Extracted from AuthService so that controllers and other services can
// manage user state without coupling to JWT or password hashing.
// ---------------------------------------------------------------------------

import { getPrisma } from "./PrismaService";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Full user model including read / sent / seen state sets.
 * Mirrors the original type from AuthService for API consistency.
 */
export interface UserModel {
  id: string;
  name: string;
  phoneNumber: string;
  notes?: string;
  readChatIds: Set<string>;
  sentMessageIds: Set<string>;
  seenMessageIds: Set<string>;
}

// ── Read helpers ───────────────────────────────────────────────────────────

/**
 * Load a user together with their read / sent / seen sets from the database.
 */
export async function getUserModel(userId: string): Promise<UserModel | null> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      readChats: true,
      sentMessages: true,
      seenMessages: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    phoneNumber: user.phoneNumber,
    notes: user.notes ?? undefined,
    readChatIds: new Set(user.readChats.map((rc) => rc.chatId)),
    sentMessageIds: new Set(user.sentMessages.map((sm) => sm.messageId)),
    seenMessageIds: new Set(user.seenMessages.map((sm) => sm.messageId)),
  };
}

// ── Write helpers ──────────────────────────────────────────────────────────

/**
 * Mark a chat as read by a user (idempotent).
 */
export async function markChatRead(
  userId: string,
  chatId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.readChat.upsert({
    where: { userId_chatId: { userId, chatId } },
    create: { userId, chatId },
    update: {},
  });
}

/**
 * Unmark a chat as read by a user.
 */
export async function unmarkChatRead(
  userId: string,
  chatId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.readChat.deleteMany({
    where: { userId, chatId },
  });
}