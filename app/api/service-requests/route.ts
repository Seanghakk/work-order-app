import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessServiceRequests } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessServiceRequests(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const showArchived = new URL(req.url).searchParams.get("showArchived") === "1";
  const serviceRequests = await prisma.serviceRequest.findMany({
    where: { archived: showArchived },
    include: { createdBy: true, assignedTo: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(serviceRequests);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessServiceRequests(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.title?.trim() || !body.customerName?.trim()) {
    return NextResponse.json({ error: "Title and customer name are required." }, { status: 400 });
  }
  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      title: body.title,
      customerName: body.customerName,
      isCorporatePartner: !!body.isCorporatePartner,
      soNumber: body.soNumber || null,
      description: body.description || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdById: session.user.id,
      assignedToId: body.assignedToId || null,
    },
  });
  return NextResponse.json(serviceRequest, { status: 201 });
}