import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSiteIds, canAccessWorkOrders, buildAssetWhere } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const where = await buildAssetWhere(session.user.id, session.user.role);
  const assets = await prisma.asset.findMany({
    where,
    include: { site: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can add assets." }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.tag || !body.siteId) {
    return NextResponse.json({ error: "Name, tag, and site are required." }, { status: 400 });
  }
  const siteIds = await getUserSiteIds(session.user.id, session.user.role);
  if (siteIds !== "ALL" && !siteIds.includes(body.siteId)) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  const asset = await prisma.asset.create({
    data: { name: body.name, tag: body.tag, location: body.location || null, category: body.category || null, siteId: body.siteId },
  });
  return NextResponse.json(asset, { status: 201 });
}
