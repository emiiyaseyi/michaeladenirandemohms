-- Appraisal module — ADDITIVE ONLY (regenerated 2026-06-18). Run once on production.
-- Creates all appraisal enums/tables/columns. DROPS NOTHING — existing data (incl. old KPI/Feedback) untouched.
-- Apply:  psql "$PROD_URL" -f prisma/sql/2026_appraisal_additive.sql
BEGIN;
-- CreateEnum
CREATE TYPE "AppraisalCycleStage" AS ENUM ('CONFIG', 'OPEN', 'REVIEW', 'COMPILING', 'FINALIZED');

-- CreateEnum
CREATE TYPE "AppraisalStage" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'LEAD_REVIEWING', 'LEAD_DONE', 'FINALIZED');

-- CreateEnum
CREATE TYPE "AppraisalSection" AS ENUM ('BEHAVIOURAL', 'LEADERSHIP', 'CORE_VALUE', 'PEER');

-- CreateEnum
CREATE TYPE "RaterType" AS ENUM ('SELF', 'PEER', 'MEMBER', 'PRIMARY_REVIEWER', 'COUNTER_REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReviewerRole" AS ENUM ('PRIMARY', 'COUNTER');

-- CreateEnum
CREATE TYPE "AppraisalKpiSource" AS ENUM ('STAFF', 'ADMIN');













-- AlterTable
ALTER TABLE "PerformanceCycle" ADD COLUMN     "peerCount" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "queryBands" JSONB,
ADD COLUMN     "recommendationBands" JSONB,
ADD COLUMN     "stage" "AppraisalCycleStage" NOT NULL DEFAULT 'CONFIG',
ADD COLUMN     "weights" JSONB;















-- CreateTable
CREATE TABLE "AppraisalQuestion" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "section" "AppraisalSection" NOT NULL,
    "text" TEXT NOT NULL,
    "scaleMax" INTEGER NOT NULL DEFAULT 5,
    "order" INTEGER NOT NULL DEFAULT 0,
    "adminScored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalGlobalKpi" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "deliverable" TEXT,
    "kpi" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalGlobalKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appraisal" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "stage" "AppraisalStage" NOT NULL DEFAULT 'NOT_STARTED',
    "keyAchievements" TEXT,
    "areasForImprovement" TEXT,
    "developmentPlan" TEXT,
    "employeeComments" TEXT,
    "employeeImprovementPlan" TEXT,
    "reviewerComments" TEXT,
    "counterReviewerComments" TEXT,
    "queryWarnings" INTEGER,
    "queryBadges" INTEGER,
    "queryWarningsHr" INTEGER,
    "queryBadgesHr" INTEGER,
    "queryEmployeeRating" DOUBLE PRECISION,
    "queryHrRating" DOUBLE PRECISION,
    "queryComment" TEXT,
    "recCount" INTEGER,
    "recCountHr" INTEGER,
    "recEmployeeRating" DOUBLE PRECISION,
    "recHrRating" DOUBLE PRECISION,
    "recComment" TEXT,
    "meetingEmployeeConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "meetingReviewerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "behavioural360Score" DOUBLE PRECISION,
    "behavioural360Emp" DOUBLE PRECISION,
    "behavioural360Rev" DOUBLE PRECISION,
    "jobScoreEmp" DOUBLE PRECISION,
    "jobScoreRev" DOUBLE PRECISION,
    "coreScoreEmp" DOUBLE PRECISION,
    "coreScoreRev" DOUBLE PRECISION,
    "finalEmployeePercent" DOUBLE PRECISION,
    "finalReviewerPercent" DOUBLE PRECISION,
    "finalPercent" DOUBLE PRECISION,
    "teamLeadPercent" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalRating" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "raterId" TEXT,
    "raterType" "RaterType" NOT NULL,
    "section" "AppraisalSection" NOT NULL,
    "questionId" TEXT,
    "score" DOUBLE PRECISION,
    "comment" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalKpi" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "projectName" TEXT,
    "deliverable" TEXT,
    "kpi" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employeeScore" DOUBLE PRECISION,
    "primaryScore" DOUBLE PRECISION,
    "counterScore" DOUBLE PRECISION,
    "reviewerScore" DOUBLE PRECISION,
    "evidenceUrl" TEXT,
    "employeeComment" TEXT,
    "reviewerComment" TEXT,
    "primaryComment" TEXT,
    "counterComment" TEXT,
    "source" "AppraisalKpiSource" NOT NULL DEFAULT 'STAFF',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalReviewer" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "role" "ReviewerRole" NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalPeer" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalPeer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppraisalQuestion_cycleId_idx" ON "AppraisalQuestion"("cycleId");

-- CreateIndex
CREATE INDEX "AppraisalGlobalKpi_cycleId_idx" ON "AppraisalGlobalKpi"("cycleId");

-- CreateIndex
CREATE INDEX "Appraisal_employeeId_idx" ON "Appraisal"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Appraisal_cycleId_employeeId_key" ON "Appraisal"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "AppraisalRating_appraisalId_idx" ON "AppraisalRating"("appraisalId");

-- CreateIndex
CREATE INDEX "AppraisalRating_raterId_idx" ON "AppraisalRating"("raterId");

-- CreateIndex
CREATE INDEX "AppraisalKpi_appraisalId_idx" ON "AppraisalKpi"("appraisalId");

-- CreateIndex
CREATE INDEX "AppraisalReviewer_reviewerId_idx" ON "AppraisalReviewer"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalReviewer_appraisalId_role_key" ON "AppraisalReviewer"("appraisalId", "role");

-- CreateIndex
CREATE INDEX "AppraisalPeer_peerId_idx" ON "AppraisalPeer"("peerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalPeer_appraisalId_peerId_key" ON "AppraisalPeer"("appraisalId", "peerId");

-- AddForeignKey
ALTER TABLE "AppraisalQuestion" ADD CONSTRAINT "AppraisalQuestion_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PerformanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalGlobalKpi" ADD CONSTRAINT "AppraisalGlobalKpi_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PerformanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PerformanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalRating" ADD CONSTRAINT "AppraisalRating_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalRating" ADD CONSTRAINT "AppraisalRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalRating" ADD CONSTRAINT "AppraisalRating_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AppraisalQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalKpi" ADD CONSTRAINT "AppraisalKpi_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReviewer" ADD CONSTRAINT "AppraisalReviewer_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReviewer" ADD CONSTRAINT "AppraisalReviewer_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalPeer" ADD CONSTRAINT "AppraisalPeer_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalPeer" ADD CONSTRAINT "AppraisalPeer_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
