import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSaleOrders } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessSaleOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const saleOrder = await prisma.saleOrder.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      assignedTo: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!saleOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(saleOrder);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessSaleOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const existing = await prisma.saleOrder.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.value !== undefined) data.value = body.value ? Number(body.value) : null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.title?.trim()) data.title = body.title;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.customerName?.trim()) data.customerName = body.customerName;
  if (body.isCorporatePartner !== undefined) data.isCorporatePartner = !!body.isCorporatePartner;

  const saleOrder = await prisma.saleOrder.update({ where: { id: params.id }, data });

  if (body.comment) {
    await prisma.saleOrderComment.create({
      data: { saleOrderId: params.id, authorId: session.user.id, body: body.comment },
    });
  }
  return NextResponse.json(saleOrder);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can remove sale orders." }, { status: 401 });
  }
  const saleOrder = await prisma.saleOrder.findUnique({ where: { id: params.id } });
  if (!saleOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (saleOrder.status !== "CONFIRM_PO" && saleOrder.status !== "CANCELLED") {
    return NextResponse.json({ error: "Only sale orders at Confirm PO or Cancelled can be removed." }, { status: 400 });
  }
  await prisma.saleOrderComment.deleteMany({ where: { saleOrderId: params.id } });
  await prisma.saleOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}