import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessServiceRequests, canEditWorkflowFields, checkSiteAccess, getUserSiteIds } from "@/lib/permissions";
import { sendEmail, serviceRequestAssignedEmail, serviceRequestStatusChangedEmail, serviceRequestNewCommentEmail } from "@/lib/email";
import { isValidHttpUrl } from "@/lib/url";
import { notifyUser } from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessServiceRequests(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      assignedTo: true,
      team: true,
      site: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!serviceRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, serviceRequest.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  return NextResponse.json(serviceRequest);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessServiceRequests(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const before = await prisma.serviceRequest.findUnique({
    where: { id: params.id },
    include: { createdBy: true, assignedTo: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, before.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }

  const body = await req.json();

  // Workflow fields (status/assignedToId/teamId/dueDate) are locked to the creator,
  // current assignee, the record's team leader, or MANAGER/ADMIN — everything else
  // (title, customer info, description, etc.) stays open to anyone who passed the
  // canAccessServiceRequests check above. See lib/permissions.ts#canEditWorkflowFields.
  const touchesWorkflow = body.status !== undefined || body.assignedToId !== undefined || body.teamId !== undefined || body.dueDate !== undefined;
  if (touchesWorkflow && !(await canEditWorkflowFields(session.user.id, session.user.role, before))) {
    return NextResponse.json({ error: "Only the creator, assignee, team leader, or a manager can change status, assignment, team, or due date." }, { status: 403 });
  }

  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.title?.trim()) data.title = body.title;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.customerName?.trim()) data.customerName = body.customerName;
  if (body.isCorporatePartner !== undefined) data.isCorporatePartner = !!body.isCorporatePartner;
  if (body.soNumber !== undefined) data.soNumber = body.soNumber || null;
  if (body.documentControlUrl !== undefined) {
    const trimmed = (body.documentControlUrl || "").trim();
    if (trimmed && !isValidHttpUrl(trimmed)) {
      return NextResponse.json({ error: "Document Control link must be a valid http(s) URL." }, { status: 400 });
    }
    data.documentControlUrl = trimmed || null;
  }
  if (typeof body.archived === "boolean" && (session.user.role === "MANAGER" || session.user.role === "ADMIN")) data.archived = body.archived;
  if (body.teamId !== undefined) {
    data.teamId = body.teamId || null;
    if (body.teamId) {
      const team = await prisma.team.findUnique({ where: { id: body.teamId }, select: { category: true } });
      data.category = team?.category || null;
    }
  }
  if (body.siteId !== undefined) {
    if (!body.siteId) {
      return NextResponse.json({ error: "Site is required." }, { status: 400 });
    }
    const siteIds = await getUserSiteIds(session.user.id, session.user.role);
    if (siteIds !== "ALL" && !siteIds.includes(body.siteId)) {
      return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
    }
    data.siteId = body.siteId;
  }

  const serviceRequest = await prisma.serviceRequest.update({ where: { id: params.id }, data });

  let newComment: { body: string } | null = null;
  if (body.comment) {
    newComment = await prisma.serviceRequestComment.create({
      data: { serviceRequestId: params.id, authorId: session.user.id, body: body.comment },
    });
  }

  // Notifications — never let a failure here affect the response
  try {
    const notifications: Promise<any>[] = [];
    const managers = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] }, active: true, id: { not: session.user.id } },
      select: { id: true, email: true, telegramChatId: true },
    });
    const link = `/service-requests/${params.id}`;

    if (data.assignedToId && data.assignedToId !== before.assignedToId) {
      const newAssignee = await prisma.user.findUnique({ where: { id: data.assignedToId } });
      if (newAssignee) {
        const { subject, html } = serviceRequestAssignedEmail(before.title, params.id);
        notifications.push(sendEmail(newAssignee.email, subject, html));
        notifications.push(notifyUser(newAssignee.id, `You've been assigned to "${before.title}"`, link));
        if (newAssignee.telegramChatId) {
          notifications.push(sendTelegramMessage(newAssignee.telegramChatId, `You've been assigned to: ${before.title}`));
        }
      }
    }

    if (data.status && data.status !== before.status) {
      const { subject, html } = serviceRequestStatusChangedEmail(before.title, data.status, params.id);
      const recipients = new Map<string, { email: string; telegramChatId: string | null }>();
      if (before.createdBy && before.createdBy.id !== session.user.id) recipients.set(before.createdBy.id, { email: before.createdBy.email, telegramChatId: before.createdBy.telegramChatId });
      if (before.assignedTo && before.assignedTo.id !== session.user.id) recipients.set(before.assignedTo.id, { email: before.assignedTo.email, telegramChatId: before.assignedTo.telegramChatId });
      managers.forEach((m) => recipients.set(m.id, { email: m.email, telegramChatId: m.telegramChatId }));
      recipients.forEach((info, userId) => {
        notifications.push(sendEmail(info.email, subject, html));
        notifications.push(notifyUser(userId, `"${before.title}" moved to ${data.status}`, link));
        if (info.telegramChatId) {
          notifications.push(sendTelegramMessage(info.telegramChatId, `${before.title}\nStage changed to ${data.status}`));
        }
      });
    }

    if (newComment) {
      const { subject, html } = serviceRequestNewCommentEmail(before.title, session.user.name, newComment.body, params.id);
      const recipients = new Map<string, { email: string; telegramChatId: string | null }>();
      if (before.createdBy && before.createdBy.id !== session.user.id) recipients.set(before.createdBy.id, { email: before.createdBy.email, telegramChatId: before.createdBy.telegramChatId });
      if (before.assignedTo && before.assignedTo.id !== session.user.id) recipients.set(before.assignedTo.id, { email: before.assignedTo.email, telegramChatId: before.assignedTo.telegramChatId });
      managers.forEach((m) => recipients.set(m.id, { email: m.email, telegramChatId: m.telegramChatId }));
      recipients.forEach((info, userId) => {
        notifications.push(sendEmail(info.email, subject, html));
        notifications.push(notifyUser(userId, `${session.user.name} commented on "${before.title}"`, link));
        if (info.telegramChatId) {
          notifications.push(sendTelegramMessage(info.telegramChatId, `${session.user.name} commented on: ${before.title}\n"${newComment.body}"`));
        }
      });
    }

    await Promise.all(notifications);
  } catch (err) {
    console.error("Notification error:", err);
  }

  return NextResponse.json(serviceRequest);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can remove service requests." }, { status: 401 });
  }
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: params.id } });
  if (!serviceRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, serviceRequest.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  if (serviceRequest.status !== "CLOSE") {
    return NextResponse.json({ error: "Only closed service requests can be archived." }, { status: 400 });
  }
  await prisma.serviceRequest.update({ where: { id: params.id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}