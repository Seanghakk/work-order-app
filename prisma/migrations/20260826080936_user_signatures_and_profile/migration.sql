-- AlterTable
ALTER TABLE "User" ADD COLUMN "position" TEXT;
ALTER TABLE "User" ADD COLUMN "signatureUrl" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "completedById" TEXT;

-- CreateIndex
CREATE INDEX "WorkOrder_approvedById_idx" ON "WorkOrder"("approvedById");

-- CreateIndex
CREATE INDEX "WorkOrder_completedById_idx" ON "WorkOrder"("completedById");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
