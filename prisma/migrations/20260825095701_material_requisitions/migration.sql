CREATE TABLE "MaterialRequisition" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "object" TEXT,
    "requisitionType" TEXT NOT NULL DEFAULT 'MATERIAL',
    "systemCheck" TEXT,
    "applicantName" TEXT,
    "soNumber" TEXT,
    "projectName" TEXT,
    "expectedDelivery" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaterialRequisition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaterialRequisitionItem" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "productCode" TEXT,
    "productName" TEXT,
    "description" TEXT,
    "brandName" TEXT,
    "supplier" TEXT,
    "unit" TEXT,
    "qty" INTEGER,
    "remark" TEXT,
    CONSTRAINT "MaterialRequisitionItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialRequisitionItem" ADD CONSTRAINT "MaterialRequisitionItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "MaterialRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;