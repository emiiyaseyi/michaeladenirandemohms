-- Fixes production 500s on the admin interns page: schema.prisma was renamed from
-- tlReviewer/tlComment/tlReviewedAt to plReviewer/plComment/plReviewedAt, but
-- production's InternWeeklyReport table still had the old column names.
-- Plain renames preserve all existing review data.
ALTER TABLE "InternWeeklyReport" RENAME COLUMN "tlReviewerId" TO "plReviewerId";
ALTER TABLE "InternWeeklyReport" RENAME COLUMN "tlComment" TO "plComment";
ALTER TABLE "InternWeeklyReport" RENAME COLUMN "tlReviewedAt" TO "plReviewedAt";
