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
  const requisition = await prisma.materialRequisition.findUnique({
    where: { id: params.id },
    include: { createdBy: true, items: { orderBy: { itemNo: "asc" } } },
  });
  if (!requisition) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(requisition);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const data: any = {};
  if (body.referenceNo !== undefined) data.referenceNo = body.referenceNo || null;
  if (body.date) data.date = new Date(body.date);
  if (body.object !== undefined) data.object = body.object || null;
  if (body.requisitionType) data.requisitionType = body.requisitionType;
  if (body.systemCheck !== undefined) data.systemCheck = body.systemCheck || null;
  if (body.applicantName !== undefined) data.applicantName = body.applicantName || null;
  if (body.soNumber !== undefined) data.soNumber = body.soNumber || null;
  if (body.projectName !== undefined) data.projectName = body.projectName || null;
  if (body.expectedDelivery !== undefined) data.expectedDelivery = body.expectedDelivery ? new Date(body.expectedDelivery) : null;
  if (body.status) data.status = body.status;

  await prisma.materialRequisition.update({ where: { id: params.id }, data });

  if (Array.isArray(body.items)) {
    const existing = await prisma.materialRequisitionItem.findMany({ where: { requisitionId: params.id }, select: { id: true } });
    const keepIds = body.items.filter((it: any) => it.id).map((it: any) => it.id);
    const removedIds = existing.map((e) => e.id).filter((id) => !keepIds.includes(id));
    if (removedIds.length > 0) {
      await prisma.materialRequisitionItem.deleteMany({ where: { id: { in: removedIds } } });
    }
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      const itemData = {
        itemNo: i + 1,
        productCode: it.productCode || null,
        productName: it.productName || null,
        description: it.description || null,
        brandName: it.brandName || null,
        supplier: it.supplier || null,
        unit: it.unit || null,
        qty: it.qty ? Number(it.qty) : null,
        remark: it.remark || null,
      };
      if (it.id) {
        await prisma.materialRequisitionItem.update({ where: { id: it.id }, data: itemData });
      } else {
        await prisma.materialRequisitionItem.create({ data: { ...itemData, requisitionId: params.id } });
      }
    }
  }

  const finalRequisition = await prisma.materialRequisition.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { itemNo: "asc" } } },
  });
  return NextResponse.json(finalRequisition);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Only managers can remove material requisitions." }, { status: 401 });
  }
  await prisma.materialRequisition.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}