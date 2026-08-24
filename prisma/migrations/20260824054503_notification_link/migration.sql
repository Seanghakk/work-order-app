ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
UPDATE "Notification" SET "link" = '/work-orders/' || "workOrderId" WHERE "workOrderId" IS NOT NULL;