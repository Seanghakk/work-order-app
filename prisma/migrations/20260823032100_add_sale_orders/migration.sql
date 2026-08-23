ALTER TYPE "Role" ADD VALUE 'SALES';
ALTER TYPE "Role" ADD VALUE 'ENGINEERING';
ALTER TYPE "Role" ADD VALUE 'AA';

CREATE TYPE "SaleOrderStatus" AS ENUM ('INQUIRY', 'QUOTATION', 'CONFIRMED', 'PROCUREMENT', 'DELIVERED', 'INVOICED', 'CLOSED', 'CANCELLED');

CREATE TABLE "SaleOrder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "description" TEXT,
    "status" "SaleOrderStatus" NOT NULL DEFAULT 'INQUIRY',
    "value" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaleOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SaleOrderComment" (
    "id" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleOrderComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SaleOrderComment" ADD CONSTRAINT "SaleOrderComment_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleOrderComment" ADD CONSTRAINT "SaleOrderComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;