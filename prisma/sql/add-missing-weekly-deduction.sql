ALTER TABLE "InternReportSettings"
  ADD COLUMN IF NOT EXISTS "missingWeeklyDeduction" INTEGER NOT NULL DEFAULT 10;
