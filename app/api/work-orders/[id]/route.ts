import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, workOrderAssignedEmail, statusChangedEmail, newCommentEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      asset: true,
      assignedTo: true,
      requestedBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workOrder);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can remove work orders." }, { status: 401 });
  }
  const workOrder = await prisma.workOrder.findUnique({ where: { id: params.id } });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELED") {
    return NextResponse.json({ error: "Only completed or canceled work orders can be cleared." }, { status: 400 });
  }
  await prisma.comment.deleteMany({ where: { workOrderId: params.id } });
  await prisma.workOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const data: any = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "COMPLETED") data.completedAt = new Date();
  }
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.priority) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

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
    const managers = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] }, active: true, id: { not: session.user.id } },
      select: { id: true, email: true },
    });

    if (data.assignedToId && data.assignedToId !== before.assignedToId) {
      const newAssignee = await prisma.user.findUnique({ where: { id: data.assignedToId } });
            if (newAssignee) {
        const { subject, html } = workOrderAssignedEmail(before.title, params.id);
        emails.push(sendEmail(newAssignee.email, subject, html));
        emails.push(notifyUser(newAssignee.id, `You've been assigned to "${before.title}"`, params.id));
      }
    }

    if (data.status && data.status !== before.status) {
      const { subject, html } = statusChangedEmail(before.title, data.status, params.id);
      const recipients = new Map<string, string>();
      if (before.requestedBy && before.requestedBy.id !== session.user.id) recipients.set(before.requestedBy.id, before.requestedBy.email);
      if (before.assignedTo && before.assignedTo.id !== session.user.id) recipients.set(before.assignedTo.id, before.assignedTo.email);
      managers.forEach((m) => recipients.set(m.id, m.email));
      recipients.forEach((email, userId) => {
        emails.push(sendEmail(email, subject, html));
        emails.push(notifyUser(userId, `"${before.title}" status changed to ${data.status.replace("_", " ")}`, params.id));
      });
    }

        if (newComment) {
      const { subject, html } = newCommentEmail(before.title, session.user.name, newComment.body, params.id);
      const recipients = new Map<string, string>();
      if (before.requestedBy && before.requestedBy.id !== session.user.id) recipients.set(before.requestedBy.id, before.requestedBy.email);
      if (before.assignedTo && before.assignedTo.id !== session.user.id) recipients.set(before.assignedTo.id, before.assignedTo.email);
      managers.forEach((m) => recipients.set(m.id, m.email));
      recipients.forEach((email, userId) => {
        emails.push(sendEmail(email, subject, html));
        emails.push(notifyUser(userId, `${session.user.name} commented on "${before.title}"`, params.id));
      });
    }

    await Promise.all(emails);
  } catch (err) {
    console.error("Notification error:", err);
  }

  return NextResponse.json(workOrder);
}