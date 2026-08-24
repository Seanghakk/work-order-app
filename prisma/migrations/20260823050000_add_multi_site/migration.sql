-- 1. Create Site table
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- 2. Create the User <-> Site join table
CREATE TABLE "UserSite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    CONSTRAINT "UserSite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSite_userId_siteId_key" ON "UserSite"("userId", "siteId");
ALTER TABLE "UserSite" ADD CONSTRAINT "UserSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSite" ADD CONSTRAINT "UserSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Create a default site — every existing record and user gets assigned here automatically,
--    so nothing breaks and nobody is locked out the moment this deploys.
INSERT INTO "Site" ("id", "name", "address", "active", "createdAt")
VALUES ('default-site-0001', 'Main Site', NULL, true, CURRENT_TIMESTAMP);

-- 4. Assign every existing user to the default site
INSERT INTO "UserSite" ("id", "userId", "siteId")
SELECT 'useg_' || "id", "id", 'default-site-0001' FROM "User";

-- 5. Add siteId as nullable first (existing rows have no value yet)
ALTER TABLE "Asset" ADD COLUMN "siteId" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "siteId" TEXT;
ALTER TABLE "SaleOrder" ADD COLUMN "siteId" TEXT;

-- 6. Backfill every existing row to the default site
UPDATE "Asset" SET "siteId" = 'default-site-0001';
UPDATE "WorkOrder" SET "siteId" = 'default-site-0001';
UPDATE "SaleOrder" SET "siteId" = 'default-site-0001';

-- 7. Now that every row has a value, make the column required
ALTER TABLE "Asset" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "WorkOrder" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "SaleOrder" ALTER COLUMN "siteId" SET NOT NULL;

-- 8. Add the foreign key constraints
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
