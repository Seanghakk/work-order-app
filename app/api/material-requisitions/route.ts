import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccess(role?: string) {
  return role && role !== "REQUESTER";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requisitions = await prisma.materialRequisition.findMany({
    include: { createdBy: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requisitions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccess(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Add at least one item." }, { status: 400 });
  }
  const requisition = await prisma.materialRequisition.create({
    data: {
      referenceNo: body.referenceNo || null,
      date: body.date ? new Date(body.date) : new Date(),
      object: body.object || null,
      requisitionType: body.requisitionType || "MATERIAL",
      systemCheck: body.systemCheck || null,
      applicantName: body.applicantName || session.user.name,
      soNumber: body.soNumber || null,
      projectName: body.projectName || null,
      expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
      createdById: session.user.id,
      items: {
        create: items.map((it: any, i: number) => ({
          itemNo: i + 1,
          productCode: it.productCode || null,
          productName: it.productName || null,
          description: it.description || null,
          brandName: it.brandName || null,
          supplier: it.supplier || null,
          unit: it.unit || null,
          qty: it.qty ? Number(it.qty) : null,
          remark: it.remark || null,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json(requisition, { status: 201 });
}