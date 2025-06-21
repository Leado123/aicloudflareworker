-- CreateEnum
CREATE TYPE "KeyType" AS ENUM ('GEMINI', 'CEREBRAS');

-- CreateTable
CREATE TABLE "APIKeys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "KeyType" NOT NULL DEFAULT 'GEMINI',

    CONSTRAINT "APIKeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "APIKeys_key_key" ON "APIKeys"("key");
