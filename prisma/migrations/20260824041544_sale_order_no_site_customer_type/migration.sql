ALTER TABLE "SaleOrder" DROP CONSTRAINT "SaleOrder_siteId_fkey";
ALTER TABLE "SaleOrder" DROP COLUMN "siteId";
ALTER TABLE "SaleOrder" ADD COLUMN "isCorporatePartner" BOOLEAN NOT NULL DEFAULT false;