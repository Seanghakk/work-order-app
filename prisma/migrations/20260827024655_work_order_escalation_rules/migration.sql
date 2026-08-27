-- AlterTable
ALTER TABLE "Team" ADD COLUMN "backupApproverId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "pendingApprovalSince" TIMESTAMP(3);
ALTER TABLE "WorkOrder" ADD COLUMN "lastEscalatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Team_backupApproverId_idx" ON "Team"("backupApproverId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_backupApproverId_fkey" FOREIGN KEY ("backupApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: any WorkOrder already sitting in PENDING_APPROVAL when this migration
-- runs has no historical record of when it most recently entered that status (this
-- feature didn't exist before now). createdAt is the best available approximation —
-- exactly correct for a record that's never been rejected/resubmitted, and the only
-- available fallback otherwise. Without this, pre-existing pending records would have
-- pendingApprovalSince permanently NULL and never become eligible for escalation.
UPDATE "WorkOrder" SET "pendingApprovalSince" = "createdAt" WHERE "status" = 'PENDING_APPROVAL' AND "pendingApprovalSince" IS NULL;
