import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessWorkOrders } from "@/lib/permissions";
import { generateWorkOrderReportPdf } from "@/lib/workOrderReportPdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      asset: true,
      assignedTo: true,
      requestedBy: true,
      site: true,
      team: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      photos: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdfBuffer = await generateWorkOrderReportPdf(wo);
  const safeName = wo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="work-order-${safeName}.pdf"`,
    },
  });
}