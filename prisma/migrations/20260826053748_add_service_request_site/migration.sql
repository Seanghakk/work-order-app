-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN "siteId" TEXT;

-- CreateIndex
CREATE INDEX "ServiceRequest_siteId_archived_idx" ON "ServiceRequest"("siteId", "archived");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
