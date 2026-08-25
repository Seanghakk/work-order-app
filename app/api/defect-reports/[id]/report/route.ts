import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDefectReportPdf } from "@/lib/defectReportPdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "REQUESTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await prisma.defectReport.findUnique({
    where: { id: params.id },
    include: { createdBy: true, site: true, workOrder: true, items: { orderBy: { itemNo: "asc" } } },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdfBuffer = await generateDefectReportPdf(report);
  const safeName = (report.dfNumber || report.projectName).replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="defect-report-${safeName}.pdf"`,
    },
  });
}