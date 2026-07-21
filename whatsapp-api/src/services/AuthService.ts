// ---------------------------------------------------------------------------
// AuthService – user registration, login, and JWT issuance/verification.
//
// Passwords are hashed with bcryptjs before storage. JWTs are signed with
// a configurable secret (defaults to a random value in development for
// convenience, but MUST be set to a fixed secret in production).
// ---------------------------------------------------------------------------

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPrisma } from "./PrismaService";
import { config } from "../config";

const SALT_ROUNDS = 12;

// ── Exported types ──────────────────────────────────────────────────────────

export interface JWTContents {
  userId: string;
  name: string;
}

export interface CreateUserRequest {
  name: string;
  password: string;
  phoneNumber: string;
  notes?: string;
}

export interface UserModel {
  id: string;
  name: string;
  phoneNumber: string;
  notes?: string;
  readChatIds: Set<string>;
  sentMessageIds: Set<string>;
  seenMessageIds: Set<string>;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Register a new user. Throws if `phoneNumber` is already taken.
 */
export async function createUser(req: CreateUserRequest): Promise<JWTContents> {
  const prisma = getPrisma();

  // Check for duplicate phoneNumber
  const existing = await prisma.user.findUnique({
    where: { phoneNumber: req.phoneNumber },
  });
  if (existing) {
    throw Object.assign(new Error("Phone number already registered"), {
      status: 409,
    });
  }

  const passwordHash = await bcrypt.hash(req.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: req.name,
      phoneNumber: req.phoneNumber,
      passwordHash,
      notes: req.notes ?? null,
    },
  });

  return { userId: user.id, name: user.name };
}

/**
 * Authenticate a user by phoneNumber + password.
 * Returns JWT contents on success, throws on mismatch.
 */
export async function authenticateUser(
  phoneNumber: string,
  password: string,
): Promise<JWTContents> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  return { userId: user.id, name: user.name };
}

/**
 * Sign a JWTContents payload into a JWT string.
 */
export function signJWT(contents: JWTContents): string {
  return jwt.sign(contents, config.JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verify and decode a JWT string. Returns the payload or throws.
 */
export function verifyJWT(token: string): JWTContents {
  return jwt.verify(token, config.JWT_SECRET) as JWTContents;
}

// ── Read / sent / seen state helpers ────────────────────────────────────────

/**
 * Load a full UserModel (with Sets populated) from the database.
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

/**
 * Record a message as seen by a user (idempotent).
 */
export async function markMessageSeen(
  userId: string,
  messageId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.seenMessage.upsert({
    where: { userId_messageId: { userId, messageId } },
    create: { userId, messageId },
    update: {},
  });
}

/**
 * Record a message as sent by a user (idempotent).
 */
export async function markMessageSent(
  userId: string,
  messageId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.sentMessage.upsert({
    where: { userId_messageId: { userId, messageId } },
    create: { userId, messageId },
    update: {},
  });
}