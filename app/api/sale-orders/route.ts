import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSaleOrders, getUserSiteIds, siteWhere } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessSaleOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const siteIds = await getUserSiteIds(session.user.id, session.user.role);
  const saleOrders = await prisma.saleOrder.findMany({
    where: siteWhere(siteIds),
    include: { createdBy: true, assignedTo: true, site: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(saleOrders);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessSaleOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.title?.trim() || !body.customerName?.trim() || !body.siteId) {
    return NextResponse.json({ error: "Title, customer name, and site are required." }, { status: 400 });
  }
  const siteIds = await getUserSiteIds(session.user.id, session.user.role);
  if (siteIds !== "ALL" && !siteIds.includes(body.siteId)) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  const saleOrder = await prisma.saleOrder.create({
    data: {
      title: body.title,
      customerName: body.customerName,
      description: body.description || null,
      value: body.value ? Number(body.value) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdById: session.user.id,
      assignedToId: body.assignedToId || null,
      siteId: body.siteId,
    },
  });
  return NextResponse.json(saleOrder, { status: 201 });
}
