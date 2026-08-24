UPDATE "SaleOrder" SET "status" = 'INQUIRY' WHERE "status" NOT IN ('INQUIRY', 'CANCELLED');

CREATE TYPE "SaleOrderStatus_new" AS ENUM ('INQUIRY', 'DRAWING', 'BOQ', 'SUBMIT_TO_SALE', 'CONFIRM_PO', 'CANCELLED');

ALTER TABLE "SaleOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SaleOrder" ALTER COLUMN "status" TYPE "SaleOrderStatus_new" USING (status::text::"SaleOrderStatus_new");
ALTER TABLE "SaleOrder" ALTER COLUMN "status" SET DEFAULT 'INQUIRY';

DROP TYPE "SaleOrderStatus";
ALTER TYPE "SaleOrderStatus_new" RENAME TO "SaleOrderStatus";