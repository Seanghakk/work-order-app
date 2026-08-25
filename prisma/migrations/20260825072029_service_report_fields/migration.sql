ALTER TABLE "WorkOrder" ADD COLUMN "serviceType" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "discipline" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "soNumber" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "problemFixed" BOOLEAN;
ALTER TABLE "WorkOrder" ADD COLUMN "problemNotFixedReason" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "arrivalAt" TIMESTAMP(3);
ALTER TABLE "WorkOrder" ADD COLUMN "departureAt" TIMESTAMP(3);