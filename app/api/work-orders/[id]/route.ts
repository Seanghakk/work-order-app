import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendEmailWithAttachment, workOrderAssignedEmail, statusChangedEmail, newCommentEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { sendTelegramMessage } from "@/lib/telegram";
import { getUserSiteIds, canAccessWorkOrders, canApproveOrSignOff, canEditWorkflowFields } from "@/lib/permissions";
import { generateWorkOrderReportPdf } from "@/lib/workOrderReportPdf";
import { isValidHttpUrl } from "@/lib/url";

async function checkSiteAccess(userId: string, role: string, siteId: string) {
  const siteIds = await getUserSiteIds(userId, role);
  return siteIds === "ALL" || siteIds.includes(siteId);
}

// The five gated transitions in the approval workflow. All five require the same
// canApproveOrSignOff gate (team leader or MANAGER/ADMIN — deliberately excludes the
// record's own requester/assignee, including for resubmit).
const ACTION_TRANSITIONS: Record<string, { from: string; to: string; requiresReason?: boolean; label?: string }> = {
  approve:  { from: "PENDING_APPROVAL", to: "APPROVED" },
  reject:   { from: "PENDING_APPROVAL", to: "OPEN", requiresReason: true, label: "Rejected" },
  signoff:  { from: "PENDING_SIGNOFF",  to: "COMPLETED" },
  sendback: { from: "PENDING_SIGNOFF",  to: "IN_PROGRESS", label: "Sent back to In Progress" },
  resubmit: { from: "OPEN",             to: "PENDING_APPROVAL" },
};

// Statuses that can ONLY be reached through the named actions above — rejecting a
// direct PATCH { status: ... } attempt at any of these closes the loophole where
// someone with canEdit could bypass the approve/reject/sign-off/resubmit gate entirely.
const ACTION_ONLY_STATUSES = ["PENDING_APPROVAL", "APPROVED", "COMPLETED", "OPEN"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      asset: true,
      assignedTo: true,
      requestedBy: true,
      approvedBy: true,
      completedBy: true,
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

  const before = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: { assignedTo: true, requestedBy: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkSiteAccess(session.user.id, session.user.role, before.siteId))) {
    return NextResponse.json({ error: "You don't have access to that site." }, { status: 403 });
  }

  const data: any = {};
  let commentBody: string | null = body.comment || null;

  if (typeof body.action === "string") {
    // === Gated approval-workflow actions ===
    const transition = ACTION_TRANSITIONS[body.action];
    if (!transition) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    if (before.status !== transition.from) {
      return NextResponse.json({ error: `This work order isn't in a state where "${body.action}" applies.` }, { status: 409 });
    }
    if (!(await canApproveOrSignOff(session.user.id, session.user.role, before.teamId))) {
      return NextResponse.json({ error: "Only the team leader or a manager can do this." }, { status: 403 });
    }
    if (transition.requiresReason && !body.reason?.trim()) {
      return NextResponse.json({ error: "A reason is required." }, { status: 400 });
    }
    data.status = transition.to;
    if (transition.to === "COMPLETED") data.completedAt = new Date();
    if (body.action === "approve") data.approvedById = session.user.id;
    if (body.action === "signoff") data.completedById = session.user.id;
    if (transition.label && body.reason?.trim()) {
      commentBody = `${transition.label}: ${body.reason.trim()}`;
    }
  } else {
    // === Existing generic field-update path ===
    if (body.status && ACTION_ONLY_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `"${body.status}" can only be reached through the approve/reject/sign-off/resubmit actions, not set directly.` }, { status: 400 });
    }
    // Workflow fields (status/assignedToId/teamId/dueDate) are locked to the creator,
    // current assignee, the record's team leader, or MANAGER/ADMIN — replacing the old
    // REQUESTER-only block entirely. priority is deliberately excluded — it stays open
    // to anyone with base module access, no ownership check. Only applies here, in the
    // generic path — the action branch above already has its own, narrower
    // canApproveOrSignOff gate for the status changes it makes. Applies uniformly to
    // every status target, including ON_HOLD/CANCELED — no exemption.
    const touchesWorkflow = body.status !== undefined || body.assignedToId !== undefined || body.teamId !== undefined || body.dueDate !== undefined;
    if (touchesWorkflow) {
      const allowed = await canEditWorkflowFields(session.user.id, session.user.role, {
        createdById: before.requestedById,
        assignedToId: before.assignedToId,
        teamId: before.teamId,
      });
      if (!allowed) {
        return NextResponse.json({ error: "Only the creator, assignee, team leader, or a manager can change status, assignment, team, or due date." }, { status: 403 });
      }
    }
    if (body.status) data.status = body.status;
  }

  // Title/description are content fields, gated the same way DefectReport/ServiceRequest's
  // workflow fields are — creator, assignee, team leader, or MANAGER/ADMIN. WorkOrder's
  // creator field is named requestedById (not createdById), so it's mapped here rather
  // than renamed, matching the approach used elsewhere this helper is reused.
  const touchesContent = body.title !== undefined || body.description !== undefined;
  if (touchesContent) {
    const allowed = await canEditWorkflowFields(session.user.id, session.user.role, {
      createdById: before.requestedById,
      assignedToId: before.assignedToId,
      teamId: before.teamId,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Only the creator, assignee, team leader, or a manager can edit the title or description." }, { status: 403 });
    }
  }
  if (body.title?.trim()) data.title = body.title;
  if (body.description?.trim()) data.description = body.description;

  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.priority) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (typeof body.archived === "boolean" && (session.user.role === "MANAGER" || session.user.role === "ADMIN")) data.archived = body.archived;
  if (body.partsNeeded !== undefined) data.partsNeeded = body.partsNeeded || null;
  if (typeof body.warrantyClaim === "boolean") data.warrantyClaim = body.warrantyClaim;
  if (body.serviceType !== undefined) data.serviceType = body.serviceType || null;
  if (body.discipline !== undefined) data.discipline = body.discipline || null;
  if (body.soNumber !== undefined) data.soNumber = body.soNumber || null;
  if (body.documentControlUrl !== undefined) {
    const trimmed = (body.documentControlUrl || "").trim();
    if (trimmed && !isValidHttpUrl(trimmed)) {
      return NextResponse.json({ error: "Document Control link must be a valid http(s) URL." }, { status: 400 });
    }
    data.documentControlUrl = trimmed || null;
  }
  if (typeof body.problemFixed === "boolean" || body.problemFixed === null) data.problemFixed = body.problemFixed;
  if (body.problemNotFixedReason !== undefined) data.problemNotFixedReason = body.problemNotFixedReason || null;
  if (body.arrivalAt !== undefined) data.arrivalAt = body.arrivalAt ? new Date(body.arrivalAt) : null;
  if (body.departureAt !== undefined) data.departureAt = body.departureAt ? new Date(body.departureAt) : null;
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
  if (commentBody) {
    newComment = await prisma.comment.create({
      data: { workOrderId: params.id, authorId: session.user.id, body: commentBody },
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

    if (data.status === "COMPLETED" && before.status !== "COMPLETED") {
      const full = await prisma.workOrder.findUnique({
        where: { id: params.id },
        include: {
          asset: true, assignedTo: true, requestedBy: true, approvedBy: true, completedBy: true, site: true, team: true,
          comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
          photos: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" } },
        },
      });
      if (full) {
        try {
          const pdfBuffer = await generateWorkOrderReportPdf(full);
          const safeName = full.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
          const reportRecipients = new Map<string, string>();
          if (before.requestedBy) reportRecipients.set(before.requestedBy.id, before.requestedBy.email);
          if (before.assignedTo) reportRecipients.set(before.assignedTo.id, before.assignedTo.email);
          managers.forEach((m) => reportRecipients.set(m.id, m.email));
          const reportEmails = [...reportRecipients.values()].map((email) =>
            sendEmailWithAttachment(
              email,
              `Completed: ${full.title}`,
              `<p>The work order <strong>${full.title}</strong> has been marked complete. The full report is attached.</p>`,
              { filename: `work-order-${safeName}.pdf`, content: pdfBuffer }
            )
          );
          emails.push(...reportEmails);
        } catch (err) {
          console.error("PDF report generation/email error:", err);
        }
      }
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