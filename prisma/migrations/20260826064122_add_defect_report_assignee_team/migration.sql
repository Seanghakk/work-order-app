-- AlterTable
ALTER TABLE "DefectReport" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "DefectReport" ADD COLUMN "teamId" TEXT;

-- CreateIndex
CREATE INDEX "DefectReport_teamId_idx" ON "DefectReport"("teamId");

-- CreateIndex
CREATE INDEX "DefectReport_assignedToId_idx" ON "DefectReport"("assignedToId");

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
