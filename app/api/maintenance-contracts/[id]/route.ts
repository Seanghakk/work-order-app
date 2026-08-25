import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VIEW_ROLES = [
  "MANAGER", "ADMIN",
  "SALES_LEADER", "SALES_ENGINEER",
  "MAINTENANCE_LEADER", "MAINTENANCE_TECHNICIAN",
];
function canManage(role?: string) {
  return role === "MANAGER" || role === "ADMIN";
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !VIEW_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contract = await prisma.maintenanceContract.findUnique({ where: { id: params.id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contract);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Only managers can edit maintenance contracts." }, { status: 401 });
  }
  const body = await req.json();
  const data: any = {};
  if (body.contractType) data.contractType = body.contractType;
  if (body.clientName?.trim()) data.clientName = body.clientName;
  if (body.siteLocation?.trim()) data.siteLocation = body.siteLocation;
  if (body.originalProjectId !== undefined) data.originalProjectId = body.originalProjectId || null;
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.contractValue !== undefined) data.contractValue = body.contractValue ? Number(body.contractValue) : null;
  if (body.renewalDate !== undefined) data.renewalDate = body.renewalDate ? new Date(body.renewalDate) : null;
  if (body.siteVisitsPerYear !== undefined) data.siteVisitsPerYear = body.siteVisitsPerYear ? Number(body.siteVisitsPerYear) : null;
  if (body.status) data.status = body.status;
  // If the end date is being pushed out (renewed), clear the alert flags so future reminders fire again.
  if (body.endDate) {
    data.alert30SentAt = null;
    data.alert7SentAt = null;
  }
  const contract = await prisma.maintenanceContract.update({ where: { id: params.id }, data });
  return NextResponse.json(contract);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Only managers can remove maintenance contracts." }, { status: 401 });
  }
  await prisma.maintenanceContract.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}