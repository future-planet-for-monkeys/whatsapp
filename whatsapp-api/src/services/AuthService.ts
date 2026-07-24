// ---------------------------------------------------------------------------
// AuthService – user registration, login, and JWT issuance/verification.
//
// Passwords are hashed with bcryptjs before storage. JWTs are signed with
// a configurable secret (defaults to a random value in development for
// convenience, but MUST be set to a fixed secret in production).
//
// NOTE: User read / sent / seen state helpers have been extracted to
// UserStateService. Message-persistence helpers live in MessageService.
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

// Re-exported for API / Swagger compatibility.
// Definition lives in UserStateService alongside the read/sent/seen helpers.
export type { UserModel } from "./UserStateService";

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