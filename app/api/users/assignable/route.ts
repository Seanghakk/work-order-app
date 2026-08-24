import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "REQUESTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");

  const users = await prisma.user.findMany({
    where: { role: { in: ["TECHNICIAN", "MANAGER", "ADMIN", "SALES", "ENGINEERING", "AA", "TNC_ENGINEER", "TNC_LEADER", "MAINTENANCE_SUP"] }, active: true },
    select: { id: true, name: true, role: true, sites: { select: { siteId: true } } },
    orderBy: { name: "asc" },
  });

  // If a site is specified, only show people who actually have access to it —
  // admins always qualify since they see every site.
  const filtered = siteId
    ? users.filter((u) => u.role === "ADMIN" || u.sites.some((s) => s.siteId === siteId))
    : users;

  return NextResponse.json(filtered.map(({ sites, ...u }) => u));
}
