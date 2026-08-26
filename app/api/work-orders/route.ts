import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSiteIds, canAccessWorkOrders, buildWorkOrderWhere } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role;
  const showArchived = new URL(req.url).searchParams.get("showArchived") === "1";

  const where = await buildWorkOrderWhere(session.user.id, role, { archived: showArchived });

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: { asset: true, assignedTo: true, requestedBy: true, site: true, team: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(workOrders);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.title || !body.description || !body.siteId) {
    return NextResponse.json({ error: "Title, description, and site are required." }, { status: 400 });
  }
  const siteIds = await getUserSiteIds(session.user.id, session.user.role);
  if (siteIds !== "ALL" && !siteIds.includes(body.siteId)) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }

  let category: string | null = null;
  if (body.teamId) {
    const team = await prisma.team.findUnique({ where: { id: body.teamId }, select: { category: true } });
    category = team?.category || null;
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority || "MEDIUM",
      // Every new work order now starts in the approval workflow rather than the legacy
      // OPEN default — OPEN stays the schema default only for the pre-approval-era rows.
      status: "PENDING_APPROVAL",
      assetId: body.assetId || null,
      requestedById: session.user.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      siteId: body.siteId,
      teamId: body.teamId || null,
      category: category as any,
    },
  });
  return NextResponse.json(workOrder, { status: 201 });
}