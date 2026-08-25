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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !VIEW_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const contracts = await prisma.maintenanceContract.findMany({ orderBy: { endDate: "asc" } });
  return NextResponse.json(contracts);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Only managers can create maintenance contracts." }, { status: 401 });
  }
  const body = await req.json();
  if (!body.contractType || !body.clientName?.trim() || !body.siteLocation?.trim() || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "Contract type, client name, site location, start date, and end date are required." }, { status: 400 });
  }
  const contract = await prisma.maintenanceContract.create({
    data: {
      contractType: body.contractType,
      clientName: body.clientName,
      siteLocation: body.siteLocation,
      originalProjectId: body.originalProjectId || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      contractValue: body.contractValue ? Number(body.contractValue) : null,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
      siteVisitsPerYear: body.siteVisitsPerYear ? Number(body.siteVisitsPerYear) : null,
    },
  });
  return NextResponse.json(contract, { status: 201 });
}