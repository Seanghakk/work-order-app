import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const siteIds: string[] = Array.isArray(body.siteIds) ? body.siteIds : [];
  await prisma.userSite.deleteMany({ where: { userId: params.id } });
  if (siteIds.length > 0) {
    await prisma.userSite.createMany({ data: siteIds.map((siteId) => ({ userId: params.id, siteId })) });
  }
  return NextResponse.json({ ok: true });
}
