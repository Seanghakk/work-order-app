import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessServiceRequests } from "@/lib/permissions";
import { isValidHttpUrl } from "@/lib/url";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessServiceRequests(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const showArchived = new URL(req.url).searchParams.get("showArchived") === "1";
  const serviceRequests = await prisma.serviceRequest.findMany({
    where: { archived: showArchived },
    include: { createdBy: true, assignedTo: true, team: true },
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
  let category: string | null = "MAINTENANCE";
  if (body.teamId) {
    const team = await prisma.team.findUnique({ where: { id: body.teamId }, select: { category: true } });
    category = team?.category || "MAINTENANCE";
  }

  const documentControlUrl = (body.documentControlUrl || "").trim();
  if (documentControlUrl && !isValidHttpUrl(documentControlUrl)) {
    return NextResponse.json({ error: "Document Control link must be a valid http(s) URL." }, { status: 400 });
  }

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      title: body.title,
      customerName: body.customerName,
      isCorporatePartner: !!body.isCorporatePartner,
      soNumber: body.soNumber || null,
      documentControlUrl: documentControlUrl || null,
      description: body.description || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdById: session.user.id,
      assignedToId: body.assignedToId || null,
      teamId: body.teamId || null,
      category: category as any,
    },
  });
  return NextResponse.json(serviceRequest, { status: 201 });
}