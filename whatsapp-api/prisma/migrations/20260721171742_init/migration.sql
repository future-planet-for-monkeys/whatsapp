-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReadChat" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "chatId"),
    CONSTRAINT "ReadChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SentMessage" (
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "messageId"),
    CONSTRAINT "SentMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeenMessage" (
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "messageId"),
    CONSTRAINT "SeenMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
