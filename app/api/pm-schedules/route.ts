import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const schedules = await prisma.pMSchedule.findMany({ include: { asset: true }, orderBy: { nextDueAt: "asc" } });
  return NextResponse.json(schedules);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can create PM schedules." }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.assetId || !body.frequencyDays || !body.taskTemplate) {
    return NextResponse.json({ error: "Name, asset, frequency, and task are required." }, { status: 400 });
  }
  const schedule = await prisma.pMSchedule.create({
    data: {
      name: body.name,
      assetId: body.assetId,
      frequencyDays: Number(body.frequencyDays),
      taskTemplate: body.taskTemplate,
      nextDueAt: new Date(Date.now() + Number(body.frequencyDays) * 86400000),
    },
  });
  return NextResponse.json(schedule, { status: 201 });
}
