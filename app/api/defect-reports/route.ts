import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessDefectReports } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessDefectReports(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reports = await prisma.defectReport.findMany({
    include: { createdBy: true, site: true, workOrder: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessDefectReports(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.projectName?.trim()) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  const report = await prisma.defectReport.create({
    data: {
      dfNumber: body.dfNumber || null,
      projectName: body.projectName,
      mainContractor: body.mainContractor || null,
      subContractor: body.subContractor || "ADTECH CO., LTD",
      date: body.date ? new Date(body.date) : new Date(),
      section: body.section || null,
      discipline: body.discipline || null,
      otherDisciplineText: body.otherDisciplineText || null,
      remark: body.remark || null,
      workOrderId: body.workOrderId || null,
      siteId: body.siteId || null,
      createdById: session.user.id,
      items: {
        create: items.map((it: any, i: number) => ({
          itemNo: i + 1,
          partNumber: it.partNumber || null,
          description: it.description || null,
          brand: it.brand || null,
          unit: it.unit || null,
          qty: it.qty ? Number(it.qty) : null,
          defectDescription: it.defectDescription || null,
          photoReference: it.photoReference || null,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json(report, { status: 201 });
}