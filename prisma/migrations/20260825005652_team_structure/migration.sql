-- 1. New enums
CREATE TYPE "TeamCategory" AS ENUM ('SALES', 'PROJECT', 'MAINTENANCE');
CREATE TYPE "ContractType" AS ENUM ('DLP', 'MAINTENANCE');

-- 2. Team table
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TeamCategory" NOT NULL,
    "isCrossCategory" BOOLEAN NOT NULL DEFAULT false,
    "colorHex" TEXT NOT NULL DEFAULT '#0e5c86',
    "teamLeaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- 3. MaintenanceContract table
CREATE TABLE "MaintenanceContract" (
    "id" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "clientName" TEXT NOT NULL,
    "siteLocation" TEXT NOT NULL,
    "originalProjectId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "contractValue" DOUBLE PRECISION,
    "renewalDate" TIMESTAMP(3),
    "siteVisitsPerYear" INTEGER,
    "alert30SentAt" TIMESTAMP(3),
    "alert7SentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceContract_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MaintenanceContract_endDate_idx" ON "MaintenanceContract"("endDate");
CREATE INDEX "MaintenanceContract_contractType_status_idx" ON "MaintenanceContract"("contractType", "status");

-- 4. New columns on User
ALTER TABLE "User" ADD COLUMN "teamId" TEXT;

-- 5. New columns on WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN "category" "TeamCategory";
ALTER TABLE "WorkOrder" ADD COLUMN "teamId" TEXT;

-- 6. New columns on SaleOrder
ALTER TABLE "SaleOrder" ADD COLUMN "category" "TeamCategory" DEFAULT 'SALES';
ALTER TABLE "SaleOrder" ADD COLUMN "teamId" TEXT;

-- 7. New columns on ServiceRequest
ALTER TABLE "ServiceRequest" ADD COLUMN "category" "TeamCategory" DEFAULT 'MAINTENANCE';
ALTER TABLE "ServiceRequest" ADD COLUMN "teamId" TEXT;

-- 8. Foreign keys
ALTER TABLE "Team" ADD CONSTRAINT "Team_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;