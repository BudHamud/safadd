ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "planTier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS "deviceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "ImportUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ImportUsage_userId_date_key" ON "ImportUsage"("userId", "date");

DO $$
BEGIN
    ALTER TABLE "ImportUsage"
    ADD CONSTRAINT "ImportUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;