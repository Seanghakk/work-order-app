import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSiteIds } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role;

  // Managers and Admins see every site (needed to manage sites and assign users to them).
  // Everyone else only sees the sites they're personally assigned to.
  if (role === "ADMIN" || role === "MANAGER") {
    const sites = await prisma.site.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(sites);
  }
  const siteIds = await getUserSiteIds(session.user.id, role);
  const sites = await prisma.site.findMany({
    where: { id: { in: siteIds === "ALL" ? [] : siteIds } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(sites);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create sites." }, { status: 401 });
  }
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Site name is required." }, { status: 400 });
  const site = await prisma.site.create({ data: { name: body.name, address: body.address || null } });
  return NextResponse.json(site, { status: 201 });
}
