ALTER TABLE "ServiceRequest" ADD COLUMN "isCorporatePartner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceRequest" ADD COLUMN "soNumber" TEXT;