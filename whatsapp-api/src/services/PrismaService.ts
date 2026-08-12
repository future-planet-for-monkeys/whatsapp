// ---------------------------------------------------------------------------
// PrismaService – singleton wrapper around PrismaClient.
//
// The same instance is shared across the entire application so we never
// exhaust database connections (SQLite allows one writer at a time, and
// PrismaClient handles connection pooling internally).
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

/**
 * Returns the singleton PrismaClient instance, creating it on first call.
 *
 * In development the client logs all queries to stdout; in production only
 * errors are logged.
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "warn", "error"]
          : ["error"],
    });
  }
  return prisma;
}

/**
 * Gracefully disconnect Prisma from the database.
 * Call this during shutdown (e.g. `process.on("SIGTERM", ...)`).
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}