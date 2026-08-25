import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMaterialRequisitionPdf } from "@/lib/materialRequisitionPdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "REQUESTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requisition = await prisma.materialRequisition.findUnique({
    where: { id: params.id },
    include: { createdBy: true, items: { orderBy: { itemNo: "asc" } } },
  });
  if (!requisition) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdfBuffer = await generateMaterialRequisitionPdf(requisition);
  const safeName = (requisition.referenceNo || requisition.projectName || "requisition").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="material-requisition-${safeName}.pdf"`,
    },
  });
}