import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccess(role?: string) {
  return role && role !== "REQUESTER";
}
function canManage(role?: string) {
  return role === "MANAGER" || role === "ADMIN";
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await prisma.defectReport.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true, site: true, workOrder: true,
      items: { orderBy: { itemNo: "asc" }, include: { photos: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" } } } },
      photos: { where: { itemId: null }, include: { uploadedBy: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const data: any = {};
  if (body.dfNumber !== undefined) data.dfNumber = body.dfNumber || null;
  if (body.projectName?.trim()) data.projectName = body.projectName;
  if (body.mainContractor !== undefined) data.mainContractor = body.mainContractor || null;
  if (body.subContractor?.trim()) data.subContractor = body.subContractor;
  if (body.date) data.date = new Date(body.date);
  if (body.section !== undefined) data.section = body.section || null;
  if (body.discipline !== undefined) data.discipline = body.discipline || null;
  if (body.otherDisciplineText !== undefined) data.otherDisciplineText = body.otherDisciplineText || null;
  if (body.remark !== undefined) data.remark = body.remark || null;
  if (body.status) data.status = body.status;
  if (body.workOrderId !== undefined) data.workOrderId = body.workOrderId || null;
  if (body.siteId !== undefined) data.siteId = body.siteId || null;

  const report = await prisma.defectReport.update({
    where: { id: params.id },
    data,
    include: { items: true },
  });

  if (Array.isArray(body.items)) {
    const existing = await prisma.defectReportItem.findMany({ where: { defectReportId: params.id }, select: { id: true } });
    const keepIds = body.items.filter((it: any) => it.id).map((it: any) => it.id);
    const removedIds = existing.map((e) => e.id).filter((id) => !keepIds.includes(id));
    if (removedIds.length > 0) {
      await prisma.defectReportItem.deleteMany({ where: { id: { in: removedIds } } });
    }
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      const itemData = {
        itemNo: i + 1,
        partNumber: it.partNumber || null,
        description: it.description || null,
        brand: it.brand || null,
        unit: it.unit || null,
        qty: it.qty ? Number(it.qty) : null,
        defectDescription: it.defectDescription || null,
        photoReference: it.photoReference || null,
      };
      if (it.id) {
        await prisma.defectReportItem.update({ where: { id: it.id }, data: itemData });
      } else {
        await prisma.defectReportItem.create({ data: { ...itemData, defectReportId: params.id } });
      }
    }
  }

  const finalReport = await prisma.defectReport.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { itemNo: "asc" }, include: { photos: true } } },
  });
  return NextResponse.json(finalReport);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Only managers can remove defect reports." }, { status: 401 });
  }
  await prisma.defectReport.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}