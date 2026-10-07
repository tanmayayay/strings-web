-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BUSY',
    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProfileViewDay" (
    "profileId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProfileViewDay_pkey" PRIMARY KEY ("profileId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Availability_userId_date_key" ON "Availability"("userId", "date");
CREATE INDEX IF NOT EXISTS "Availability_userId_idx" ON "Availability"("userId");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
