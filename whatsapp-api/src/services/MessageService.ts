// ---------------------------------------------------------------------------
// MessageService — Prisma-backed persistence for message metadata.
//
// Handles three concerns:
//  1. Tracking which user sent a message (SentMessage join table)
//  2. Tracking which users have seen a message (SeenMessage join table)
//  3. Lookups that enrich a MessageDto with sentByUser / readBy fields
// ---------------------------------------------------------------------------

import type { Prisma } from "@prisma/client";
import { getPrisma } from "./PrismaService";

// ── Public types ────────────────────────────────────────────────────────────

export interface MessageSenderInfo {
  userId: string;
  name: string;
  phoneNumber: string;
}

export type ReadByMap = {
  [userId: string]: boolean;
  someone: boolean;
};

// ── Write helpers ───────────────────────────────────────────────────────────

/**
 * Upsert a Message record so that SentMessage / SeenMessage foreign-key
 * constraints are satisfied.
 *
 * Also ensures the parent Chat record exists (idempotent) — otherwise
 * Prisma throws a P2003 foreign-key violation.
 */
export async function upsertMessage(
  messageId: string,
  chatId: string,
  messageData: Prisma.InputJsonValue,
): Promise<void> {
  const prisma = getPrisma();

  // Ensure the parent Chat record exists (FK constraint on Message.chatId)
  await prisma.chat.upsert({
    where: { id: chatId },
    create: { id: chatId, chatData: {} },
    update: {},
  });

  await prisma.message.upsert({
    where: { id: messageId },
    create: { id: messageId, chatId, messageData },
    update: { messageData },
  });
}

/**
 * Record a message as sent by a user (idempotent).
 */
export async function markMessageSent(
  userId: string,
  messageId: string,
  chatId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.sentMessage.upsert({
    where: { userId_messageId: { userId, messageId } },
    create: { userId, messageId, chatId },
    update: {},
  });
}

/**
 * Record a message as seen by a user (idempotent).
 */
export async function markMessageSeen(
  userId: string,
  messageId: string,
  chatId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.seenMessage.upsert({
    where: { userId_messageId: { userId, messageId } },
    create: { userId, messageId, chatId },
    update: {},
  });
}

// ── Read helpers ────────────────────────────────────────────────────────────

/**
 * Look up the user who sent a message via the SentMessage join table.
 * Returns `null` when the message has no recorded sender.
 */
export async function getMessageSender(
  messageId: string,
): Promise<MessageSenderInfo | null> {
  const prisma = getPrisma();
  const sent = await prisma.sentMessage.findFirst({
    where: { messageId },
    include: { user: true },
  });
  if (!sent) return null;
  return {
    userId: sent.user.id,
    name: sent.user.name,
    phoneNumber: sent.user.phoneNumber,
  };
}

/**
 * Build the readBy map for a message from the SeenMessage join table.
 */
export async function getMessageReadBy(messageId: string): Promise<ReadByMap> {
  const prisma = getPrisma();
  const seenRecords = await prisma.seenMessage.findMany({
    where: { messageId },
    include: { user: true },
  });

  const readBy: ReadByMap = { someone: false };

  for (const record of seenRecords) {
    readBy[record.user.id] = true;
    readBy.someone = true;
  }

  return readBy;
}