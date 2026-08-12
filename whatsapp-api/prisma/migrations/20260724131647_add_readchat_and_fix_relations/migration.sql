/*
  Warnings:

  - Added the required column `chatId` to the `SeenMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chatId` to the `SentMessage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatData" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "messageData" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReadChat" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "chatId"),
    CONSTRAINT "ReadChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadChat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReadChat" ("chatId", "userId") SELECT "chatId", "userId" FROM "ReadChat";
DROP TABLE "ReadChat";
ALTER TABLE "new_ReadChat" RENAME TO "ReadChat";
CREATE TABLE "new_SeenMessage" (
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "messageId"),
    CONSTRAINT "SeenMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeenMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeenMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SeenMessage" ("messageId", "userId") SELECT "messageId", "userId" FROM "SeenMessage";
DROP TABLE "SeenMessage";
ALTER TABLE "new_SeenMessage" RENAME TO "SeenMessage";
CREATE TABLE "new_SentMessage" (
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "messageId"),
    CONSTRAINT "SentMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SentMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SentMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SentMessage" ("messageId", "userId") SELECT "messageId", "userId" FROM "SentMessage";
DROP TABLE "SentMessage";
ALTER TABLE "new_SentMessage" RENAME TO "SentMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
