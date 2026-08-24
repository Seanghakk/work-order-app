import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Call this on a daily schedule (cron job, Vercel Cron, or a scheduled task on your server)
// to turn due PM schedules into real work orders automatically.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.pMSchedule.findMany({
    where: { active: true, nextDueAt: { lte: new Date() } },
    include: { asset: true },
  });

  const created = [];
  for (const schedule of due) {
    const admin = await prisma.user.findFirst({ where: { role: "MANAGER" } });
    if (!admin) continue;
    const wo = await prisma.workOrder.create({
      data: {
        title: `PM: ${schedule.name}`,
        description: schedule.taskTemplate,
        priority: "MEDIUM",
        source: "PM",
        assetId: schedule.assetId,
        siteId: schedule.asset.siteId,
        requestedById: admin.id,
        pmScheduleId: schedule.id,
      },
    });
    await prisma.pMSchedule.update({
      where: { id: schedule.id },
      data: {
        lastGeneratedAt: new Date(),
        nextDueAt: new Date(Date.now() + schedule.frequencyDays * 86400000),
      },
    });
    created.push(wo);
  }
  return NextResponse.json({ createdCount: created.length });
}
