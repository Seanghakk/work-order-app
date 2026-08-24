import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessServiceRequests } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessServiceRequests(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      assignedTo: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!serviceRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serviceRequest);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessServiceRequests(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const existing = await prisma.serviceRequest.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.title?.trim()) data.title = body.title;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.customerName?.trim()) data.customerName = body.customerName;

  const serviceRequest = await prisma.serviceRequest.update({ where: { id: params.id }, data });

  if (body.comment) {
    await prisma.serviceRequestComment.create({
      data: { serviceRequestId: params.id, authorId: session.user.id, body: body.comment },
    });
  }
  return NextResponse.json(serviceRequest);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can remove service requests." }, { status: 401 });
  }
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: params.id } });
  if (!serviceRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (serviceRequest.status !== "CLOSE") {
    return NextResponse.json({ error: "Only closed service requests can be removed." }, { status: 400 });
  }
  await prisma.serviceRequestComment.deleteMany({ where: { serviceRequestId: params.id } });
  await prisma.serviceRequest.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}