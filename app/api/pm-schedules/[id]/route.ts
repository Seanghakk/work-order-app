import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSiteIds } from "@/lib/permissions";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can remove PM schedules." }, { status: 401 });
  }
  const schedule = await prisma.pMSchedule.findUnique({ where: { id: params.id }, include: { asset: true } });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const siteIds = await getUserSiteIds(session.user.id, session.user.role);
  if (siteIds !== "ALL" && !siteIds.includes(schedule.asset.siteId)) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  try {
    await prisma.pMSchedule.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "This schedule has already generated work orders linked to it and can't be deleted." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Something went wrong removing this schedule." }, { status: 500 });
  }
}
