CREATE TABLE "DefectReportPhoto" (
    "id" TEXT NOT NULL,
    "defectReportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DefectReportPhoto_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DefectReportPhoto" ADD CONSTRAINT "DefectReportPhoto_defectReportId_fkey" FOREIGN KEY ("defectReportId") REFERENCES "DefectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DefectReportPhoto" ADD CONSTRAINT "DefectReportPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;