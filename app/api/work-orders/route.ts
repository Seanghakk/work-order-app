import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSiteIds, siteWhere, canAccessWorkOrders, getLeaderTeamId } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role;
  const showArchived = new URL(req.url).searchParams.get("showArchived") === "1";

  const roleOr: any[] =
    role === "MAINTENANCE_TECHNICIAN" ? [{ assignedToId: session.user.id }, { requestedById: session.user.id }] :
    role === "REQUESTER" ? [{ requestedById: session.user.id }] :
    [];

  const leaderTeamId = await getLeaderTeamId(session.user.id);
  if (leaderTeamId) roleOr.push({ teamId: leaderTeamId });

  const siteIds = await getUserSiteIds(session.user.id, role);
  const baseWhere = { ...siteWhere(siteIds), archived: showArchived };
  const where = role === "MANAGER" || role === "ADMIN" || roleOr.length === 0
    ? baseWhere
    : { ...baseWhere, OR: roleOr };

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