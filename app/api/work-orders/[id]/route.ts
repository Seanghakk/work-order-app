import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      asset: true,
      assignedTo: true,
      requestedBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workOrder);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can remove work orders." }, { status: 401 });
  }
  const workOrder = await prisma.workOrder.findUnique({ where: { id: params.id } });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELED") {
    return NextResponse.json({ error: "Only completed or canceled work orders can be cleared." }, { status: 400 });
  }
  await prisma.comment.deleteMany({ where: { workOrderId: params.id } });
  await prisma.workOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const tryingToEditFields = body.status || body.assignedToId !== undefined || body.priority || body.dueDate !== undefined;
  if (session.user.role === "REQUESTER" && tryingToEditFields) {
    return NextResponse.json({ error: "Requesters can't change status, priority, or assignment." }, { status: 403 });
  }
  const data: any = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "COMPLETED") data.completedAt = new Date();
  }
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.priority) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const workOrder = await prisma.workOrder.update({ where: { id: params.id }, data });

  if (body.comment) {
    await prisma.comment.create({
      data: { workOrderId: params.id, authorId: session.user.id, body: body.comment },
    });
  }

  return NextResponse.json(workOrder);
}
