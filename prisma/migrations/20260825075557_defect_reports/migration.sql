CREATE TABLE "DefectReport" (
    "id" TEXT NOT NULL,
    "dfNumber" TEXT,
    "projectName" TEXT NOT NULL,
    "mainContractor" TEXT,
    "subContractor" TEXT NOT NULL DEFAULT 'ADTECH CO., LTD',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "section" TEXT,
    "discipline" TEXT,
    "otherDisciplineText" TEXT,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "workOrderId" TEXT,
    "siteId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DefectReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DefectReportItem" (
    "id" TEXT NOT NULL,
    "defectReportId" TEXT NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "partNumber" TEXT,
    "description" TEXT,
    "brand" TEXT,
    "unit" TEXT,
    "qty" INTEGER,
    "defectDescription" TEXT,
    "photoReference" TEXT,
    CONSTRAINT "DefectReportItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DefectReport" ADD CONSTRAINT "DefectReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DefectReportItem" ADD CONSTRAINT "DefectReportItem_defectReportId_fkey" FOREIGN KEY ("defectReportId") REFERENCES "DefectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;