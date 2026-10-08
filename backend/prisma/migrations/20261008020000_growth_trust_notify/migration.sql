
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "referralCode"  TEXT,
  ADD COLUMN IF NOT EXISTS "referredById"  TEXT,
  ADD COLUMN IF NOT EXISTS "foundingMember" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "email"         TEXT,
  ADD COLUMN IF NOT EXISTS "emailAlerts"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "weeklyDigest"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "lastDigestAt"  TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

UPDATE "User" SET "foundingMember" = true
WHERE "id" IN (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1000);

CREATE TABLE IF NOT EXISTS "Report" (
  "id" TEXT PRIMARY KEY,
  "reporterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");
CREATE INDEX IF NOT EXISTS "Report_target_idx" ON "Report"("targetType","targetId");

CREATE TABLE IF NOT EXISTS "Block" (
  "blockerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "blockedId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("blockerId","blockedId")
);
CREATE INDEX IF NOT EXISTS "Block_blockedId_idx" ON "Block"("blockedId");

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "revieweeId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "body" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Review_booking_reviewer_key" ON "Review"("bookingId","reviewerId");
CREATE INDEX IF NOT EXISTS "Review_reviewee_idx" ON "Review"("revieweeId","createdAt");

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

