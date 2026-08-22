import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
    const where =
    role === "TECHNICIAN" ? { OR: [{ assignedToId: session.user.id }, { requestedById: session.user.id }] } :
    role === "REQUESTER" ? { requestedById: session.user.id } :
    {};

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: { asset: true, assignedTo: true, requestedBy: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(workOrders);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title || !body.description) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority || "MEDIUM",
      assetId: body.assetId || null,
      requestedById: session.user.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(workOrder, { status: 201 });
}
