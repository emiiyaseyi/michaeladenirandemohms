-- Removes the unused NYSC value from EmploymentType (0 rows on Employee or JobPosting used it).
-- Postgres can't DROP a single enum value, so the type is recreated without it.
ALTER TYPE "EmploymentType" RENAME TO "EmploymentType_old";
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

ALTER TABLE "Employee" ALTER COLUMN "employmentType" DROP DEFAULT;
ALTER TABLE "Employee" ALTER COLUMN "employmentType" TYPE "EmploymentType" USING ("employmentType"::text::"EmploymentType");
ALTER TABLE "Employee" ALTER COLUMN "employmentType" SET DEFAULT 'FULL_TIME';

ALTER TABLE "JobPosting" ALTER COLUMN "employmentType" DROP DEFAULT;
ALTER TABLE "JobPosting" ALTER COLUMN "employmentType" TYPE "EmploymentType" USING ("employmentType"::text::"EmploymentType");
ALTER TABLE "JobPosting" ALTER COLUMN "employmentType" SET DEFAULT 'FULL_TIME';

DROP TYPE "EmploymentType_old";
