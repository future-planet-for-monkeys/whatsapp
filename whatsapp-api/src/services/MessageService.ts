// ---------------------------------------------------------------------------
// MessageService — Prisma-backed persistence for message metadata.
//
// Handles five concerns:
//  1. Tracking which user sent a message (SentMessage join table)
//  2. Tracking which users have seen a message (SeenMessage join table)
//  3. Audit logging for message edits and deletes (MessageLog table)
//  4. Tracking which app user set which reaction (MessageReaction table)
//  5. Lookups that enrich a MessageDto with sentByUser / readBy / edit-delete / reaction fields
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
  [userId: string]: any;
  someone: boolean;
  me: boolean; // Indicates if the current user has read the message
  users: { userId: string; name: string }[];
};

export interface EditDeleteInfo {
  isEdited: boolean;
  editedBy: { userId: string; name: string } | null;
  isDeleted: boolean;
  deletedBy: { userId: string; name: string } | null;
}

export interface ReactionAttribution {
  /** The emoji character */
  emoji: string;
  /** The app user who set this reaction */
  userId: string;
  /** The app user's name */
  name: string;
}

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

// ── Message edit/delete audit log ───────────────────────────────────────────

/**
 * Snapshot the current state of a message before an edit or delete operation.
 * Called BEFORE the actual WhatsApp operation so we capture the pre-change state.
 *
 * @param action  "EDIT" or "DELETE"
 * @param messageId  WhatsApp message._serialized ID
 * @param chatId  WhatsApp chat ID
 * @param userId  The app user performing the action
 * @param previousMessageData  The current Message.messageData JSON (pre-change snapshot)
 * @param newBody  For EDIT: the new body text; for DELETE: null/undefined
 */
export async function logMessageChange(
  action: "EDIT" | "DELETE",
  messageId: string,
  chatId: string,
  userId: string,
  previousMessageData: Prisma.InputJsonValue,
  newBody?: string | null,
): Promise<void> {
  const prisma = getPrisma();

  // Ensure parent records exist
  await prisma.chat.upsert({
    where: { id: chatId },
    create: { id: chatId, chatData: {} },
    update: {},
  });
  await prisma.message.upsert({
    where: { id: messageId },
    create: { id: messageId, chatId, messageData: previousMessageData },
    update: {},
  });

  await prisma.messageLog.create({
    data: {
      action,
      messageId,
      chatId,
      userId,
      previousMessageData,
      newBody: newBody ?? null,
    },
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
export async function getMessageReadBy(messageId: string, currentUserId: string): Promise<ReadByMap> {
  const prisma = getPrisma();
  const seenRecords = await prisma.seenMessage.findMany({
    where: { messageId },
    include: { user: true },
  });

  const readBy: ReadByMap = { someone: false, me: false, users: [] };

  for (const record of seenRecords) {
    readBy[record.user.id] = true;
    readBy.someone = true;
    readBy.me = readBy.me || record.user.id === currentUserId; // Mark that the current user has read the message
    readBy.users.push({
      userId: record.user.id,
      name: record.user.name,
    });
  }

  return readBy;
}

/**
 * Look up the most recent EDIT and DELETE log entries for a message.
 * Returns edit/delete status and attribution (who performed the action).
 */
export async function getMessageEditDeleteInfo(
  messageId: string,
): Promise<EditDeleteInfo> {
  const prisma = getPrisma();

  const [lastEdit, lastDelete] = await Promise.all([
    prisma.messageLog.findFirst({
      where: { messageId, action: "EDIT" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.messageLog.findFirst({
      where: { messageId, action: "DELETE" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    isEdited: lastEdit !== null,
    editedBy: lastEdit ? { userId: lastEdit.user.id, name: lastEdit.user.name } : null,
    isDeleted: lastDelete !== null,
    deletedBy: lastDelete ? { userId: lastDelete.user.id, name: lastDelete.user.name } : null,
  };
}

// ── Reaction helpers ────────────────────────────────────────────────────────

/**
 * Set (or remove) a reaction on a message by an app user.
 *
 * Uses a transaction to:
 *  1. Deactivate any existing active reaction for this messageId
 *  2. Insert a new reaction row (with active = true, or active = false if emoji is empty)
 *
 * @param userId    The app user setting the reaction
 * @param messageId WhatsApp message._serialized ID
 * @param chatId    WhatsApp chat ID
 * @param emoji     The emoji character, or empty string to remove the reaction
 */
export async function setMessageReaction(
  userId: string,
  messageId: string,
  chatId: string,
  emoji: string,
): Promise<void> {
  const prisma = getPrisma();

  // Ensure parent records exist
  await prisma.chat.upsert({
    where: { id: chatId },
    create: { id: chatId, chatData: {} },
    update: {},
  });
  await prisma.message.upsert({
    where: { id: messageId },
    create: { id: messageId, chatId, messageData: {} },
    update: {},
  });

  const isRemoval = emoji === "";

  await prisma.$transaction(async (tx) => {
    // Deactivate any existing active reaction for this message
    await tx.messageReaction.updateMany({
      where: { messageId, active: true },
      data: { active: false },
    });

    // Insert the new reaction row
    await tx.messageReaction.create({
      data: {
        messageId,
        chatId,
        userId,
        emoji,
        active: !isRemoval,
      },
    });
  });
}

/**
 * Get the current active reaction attribution for a message.
 * Returns the app user who set the currently-active reaction, or null.
 */
export async function getReactionAttribution(
  messageId: string,
): Promise<ReactionAttribution | null> {
  const prisma = getPrisma();
  const active = await prisma.messageReaction.findFirst({
    where: { messageId, active: true },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!active) return null;
  return {
    emoji: active.emoji,
    userId: active.user.id,
    name: active.user.name,
  };
}