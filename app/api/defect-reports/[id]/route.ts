import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessDefectReports, getUserSiteIds, canEditWorkflowFields } from "@/lib/permissions";

function canManage(role?: string) {
  return role === "MANAGER" || role === "ADMIN";
}

// A null siteId is treated as accessible to everyone with base module access —
// see buildDefectReportWhere in lib/permissions.ts for why (site is optional on
// a defect report, so an un-sited report isn't restricted to anyone in particular).
async function checkSiteAccess(userId: string, role: string, siteId: string | null) {
  if (!siteId) return true;
  const siteIds = await getUserSiteIds(userId, role);
  return siteIds === "ALL" || siteIds.includes(siteId);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessDefectReports(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await prisma.defectReport.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true, site: true, workOrder: true, assignedTo: true, team: true,
      items: { orderBy: { itemNo: "asc" }, include: { photos: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" } } } },
      photos: { where: { itemId: null }, include: { uploadedBy: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, report.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  return NextResponse.json(report);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessDefectReports(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const before = await prisma.defectReport.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, before.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }

  const body = await req.json();

  // Workflow fields (status/assignedToId/teamId) and line items are locked to the
  // creator, current assignee, the record's team leader, or MANAGER/ADMIN — everything
  // else (project details, contractor info, remark, etc.) stays open to anyone who
  // passed the canAccessDefectReports check above. See lib/permissions.ts#canEditWorkflowFields.
  const touchesWorkflow = body.status !== undefined || body.assignedToId !== undefined || body.teamId !== undefined;
  const touchesItems = Array.isArray(body.items);
  if ((touchesWorkflow || touchesItems) && !(await canEditWorkflowFields(session.user.id, session.user.role, before))) {
    return NextResponse.json({ error: "Only the creator, assignee, team leader, or a manager can change status, assignment, team, or line items." }, { status: 403 });
  }

  const data: any = {};
  if (body.dfNumber !== undefined) data.dfNumber = body.dfNumber || null;
  if (body.projectName?.trim()) data.projectName = body.projectName;
  if (body.mainContractor !== undefined) data.mainContractor = body.mainContractor || null;
  if (body.subContractor?.trim()) data.subContractor = body.subContractor;
  if (body.date) data.date = new Date(body.date);
  if (body.section !== undefined) data.section = body.section || null;
  if (body.discipline !== undefined) data.discipline = body.discipline || null;
  if (body.otherDisciplineText !== undefined) data.otherDisciplineText = body.otherDisciplineText || null;
  if (body.remark !== undefined) data.remark = body.remark || null;
  if (body.status) data.status = body.status;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.teamId !== undefined) data.teamId = body.teamId || null;
  if (body.workOrderId !== undefined) data.workOrderId = body.workOrderId || null;
  if (body.siteId !== undefined) {
    if (body.siteId && body.siteId !== before.siteId) {
      const siteIds = await getUserSiteIds(session.user.id, session.user.role);
      if (siteIds !== "ALL" && !siteIds.includes(body.siteId)) {
        return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
      }
    }
    data.siteId = body.siteId || null;
  }

  const report = await prisma.defectReport.update({
    where: { id: params.id },
    data,
    include: { items: true },
  });

  if (Array.isArray(body.items)) {
    const existing = await prisma.defectReportItem.findMany({ where: { defectReportId: params.id }, select: { id: true } });
    const keepIds = body.items.filter((it: any) => it.id).map((it: any) => it.id);
    const removedIds = existing.map((e) => e.id).filter((id) => !keepIds.includes(id));
    if (removedIds.length > 0) {
      await prisma.defectReportItem.deleteMany({ where: { id: { in: removedIds } } });
    }
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      const itemData = {
        itemNo: i + 1,
        partNumber: it.partNumber || null,
        description: it.description || null,
        brand: it.brand || null,
        unit: it.unit || null,
        qty: it.qty ? Number(it.qty) : null,
        defectDescription: it.defectDescription || null,
        photoReference: it.photoReference || null,
      };
      if (it.id) {
        await prisma.defectReportItem.update({ where: { id: it.id }, data: itemData });
      } else {
        await prisma.defectReportItem.create({ data: { ...itemData, defectReportId: params.id } });
      }
    }
  }

  const finalReport = await prisma.defectReport.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { itemNo: "asc" }, include: { photos: true } } },
  });
  return NextResponse.json(finalReport);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Only managers can remove defect reports." }, { status: 401 });
  }
  const report = await prisma.defectReport.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, report.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  await prisma.defectReport.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}