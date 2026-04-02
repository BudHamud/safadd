ALTER TABLE "ScanUsage"
ADD COLUMN IF NOT EXISTS "authId" TEXT;

ALTER TABLE "PendingNotification"
ADD COLUMN IF NOT EXISTS "authId" TEXT;

UPDATE "ScanUsage" AS scan
SET "authId" = usr."authId"
FROM "User" AS usr
WHERE scan."userId" = usr.id
  AND scan."authId" IS NULL;

UPDATE "PendingNotification" AS pending
SET "authId" = usr."authId"
FROM "User" AS usr
WHERE pending."userId" = usr.id
  AND pending."authId" IS NULL;

CREATE INDEX IF NOT EXISTS "ScanUsage_authId_idx" ON "ScanUsage"("authId");
CREATE INDEX IF NOT EXISTS "PendingNotification_authId_idx" ON "PendingNotification"("authId");