import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, workOrderAssignedEmail, statusChangedEmail, newCommentEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";
import { getUserSiteIds, canAccessWorkOrders } from "@/lib/permissions";

async function checkSiteAccess(userId: string, role: string, siteId: string) {
  const siteIds = await getUserSiteIds(userId, role);
  return siteIds === "ALL" || siteIds.includes(siteId);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      asset: true,
      assignedTo: true,
      requestedBy: true,
      site: true,
      team: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      photos: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, workOrder.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  return NextResponse.json(workOrder);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can remove work orders." }, { status: 401 });
  }
  const workOrder = await prisma.workOrder.findUnique({ where: { id: params.id } });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, workOrder.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }
  if (workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELED") {
    return NextResponse.json({ error: "Only completed or canceled work orders can be archived." }, { status: 400 });
  }
  await prisma.workOrder.update({ where: { id: params.id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const tryingToEditFields = body.status || body.assignedToId !== undefined || body.priority || body.dueDate !== undefined;
  if (session.user.role === "REQUESTER" && tryingToEditFields) {
    return NextResponse.json({ error: "Requesters can't change status, priority, or assignment." }, { status: 403 });
  }

  const before = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: { assignedTo: true, requestedBy: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, before.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }

  const data: any = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "COMPLETED") data.completedAt = new Date();
  }
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.priority) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (typeof body.archived === "boolean" && (session.user.role === "MANAGER" || session.user.role === "ADMIN")) data.archived = body.archived;
  if (body.partsNeeded !== undefined) data.partsNeeded = body.partsNeeded || null;
  if (typeof body.warrantyClaim === "boolean") data.warrantyClaim = body.warrantyClaim;
  if (body.teamId !== undefined) {
    data.teamId = body.teamId || null;
    if (body.teamId) {
      const team = await prisma.team.findUnique({ where: { id: body.teamId }, select: { category: true } });
      data.category = team?.category || null;
    } else {
      data.category = null;
    }
  }

  const workOrder = await prisma.workOrder.update({ where: { id: params.id }, data });

  let newComment: { body: string } | null = null;
  if (body.comment) {
    newComment = await prisma.comment.create({
      data: { workOrderId: params.id, authorId: session.user.id, body: body.comment },
    });
  }

  // Email notifications — never let a failure here affect the response
  try {
    const emails: Promise<any>[] = [];
    const allManagersAndAdmins = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] }, active: true, id: { not: session.user.id } },
      select: { id: true, email: true, role: true, telegramChatId: true },
    });
    // Only notify managers/admins who actually have access to this work order's site —
    // admins always do, managers only if they're assigned to that site.
    const managers: { id: string; email: string; telegramChatId: string | null }[] = [];
    for (const m of allManagersAndAdmins) {
      if (m.role === "ADMIN" || (await checkSiteAccess(m.id, m.role, before.siteId))) {
        managers.push(m);
      }
    }

    if (data.assignedToId && data.assignedToId !== before.assignedToId) {
      const newAssignee = await prisma.user.findUnique({ where: { id: data.assignedToId } });
      if (newAssignee) {
        const { subject, html } = workOrderAssignedEmail(before.title, params.id);
        emails.push(sendEmail(newAssignee.email, subject, html));
        emails.push(notifyUser(newAssignee.id, `You've been assigned to "${before.title}"`, `/work-orders/${params.id}`));
        if (newAssignee.telegramChatId) {
          emails.push(sendTelegramMessage(newAssignee.telegramChatId, `You've been assigned to: ${before.title}`));
        }
      }
    }

    if (data.status && data.status !== before.status) {
      const { subject, html } = statusChangedEmail(before.title, data.status, params.id);
      const recipients = new Map<string, { email: string; telegramChatId: string | null }>();
      if (before.requestedBy && before.requestedBy.id !== session.user.id) recipients.set(before.requestedBy.id, { email: before.requestedBy.email, telegramChatId: before.requestedBy.telegramChatId });
      if (before.assignedTo && before.assignedTo.id !== session.user.id) recipients.set(before.assignedTo.id, { email: before.assignedTo.email, telegramChatId: before.assignedTo.telegramChatId });
      managers.forEach((m) => recipients.set(m.id, { email: m.email, telegramChatId: m.telegramChatId }));
      recipients.forEach((info, userId) => {
        emails.push(sendEmail(info.email, subject, html));
        emails.push(notifyUser(userId, `"${before.title}" status changed to ${data.status.replace("_", " ")}`, `/work-orders/${params.id}`));
        if (info.telegramChatId) {
          emails.push(sendTelegramMessage(info.telegramChatId, `${before.title}\nStatus changed to ${data.status.replace("_", " ")}`));
        }
      });
    }

    if (newComment) {
      const { subject, html } = newCommentEmail(before.title, session.user.name, newComment.body, params.id);
      const recipients = new Map<string, { email: string; telegramChatId: string | null }>();
      if (before.requestedBy && before.requestedBy.id !== session.user.id) recipients.set(before.requestedBy.id, { email: before.requestedBy.email, telegramChatId: before.requestedBy.telegramChatId });
      if (before.assignedTo && before.assignedTo.id !== session.user.id) recipients.set(before.assignedTo.id, { email: before.assignedTo.email, telegramChatId: before.assignedTo.telegramChatId });
      managers.forEach((m) => recipients.set(m.id, { email: m.email, telegramChatId: m.telegramChatId }));
      recipients.forEach((info, userId) => {
        emails.push(sendEmail(info.email, subject, html));
        emails.push(notifyUser(userId, `${session.user.name} commented on "${before.title}"`, `/work-orders/${params.id}`));
        if (info.telegramChatId) {
          emails.push(sendTelegramMessage(info.telegramChatId, `${session.user.name} commented on: ${before.title}\n"${newComment.body}"`));
        }
      });
    }

    await Promise.all(emails);
  } catch (err) {
    console.error("Notification error:", err);
  }

  return NextResponse.json(workOrder);
}