-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- Existing messages count as delivered and read
UPDATE "Message" SET "deliveredAt" = "createdAt", "readAt" = "createdAt" WHERE "readAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Message_unread_idx" ON "Message"("conversationId") WHERE "readAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Message_undelivered_idx" ON "Message"("conversationId") WHERE "deliveredAt" IS NULL;
