import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSaleOrders } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessSaleOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const showArchived = new URL(req.url).searchParams.get("showArchived") === "1";
  const saleOrders = await prisma.saleOrder.findMany({
    where: { archived: showArchived },
    include: { createdBy: true, assignedTo: true, team: true },
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
  if (!body.title?.trim() || !body.customerName?.trim()) {
    return NextResponse.json({ error: "Title and customer name are required." }, { status: 400 });
  }
  let category: string | null = "SALES";
  if (body.teamId) {
    const team = await prisma.team.findUnique({ where: { id: body.teamId }, select: { category: true } });
    category = team?.category || "SALES";
  }

  const saleOrder = await prisma.saleOrder.create({
    data: {
      title: body.title,
      customerName: body.customerName,
      isCorporatePartner: !!body.isCorporatePartner,
      description: body.description || null,
      value: body.value ? Number(body.value) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdById: session.user.id,
      assignedToId: body.assignedToId || null,
      teamId: body.teamId || null,
      category: category as any,
    },
  });
  return NextResponse.json(saleOrder, { status: 201 });
}