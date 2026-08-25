import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailWithAttachment } from "@/lib/email";
import { canAccessWorkOrders } from "@/lib/permissions";
import { generateWorkOrderReportPdf } from "@/lib/workOrderReportPdf";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessWorkOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
  if (userIds.length === 0) {
    return NextResponse.json({ error: "Select at least one recipient." }, { status: 400 });
  }

  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: {
      asset: true, assignedTo: true, requestedBy: true, site: true, team: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      photos: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!wo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recipients = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { email: true, name: true } });
  if (recipients.length === 0) return NextResponse.json({ error: "No valid recipients found." }, { status: 400 });

  const pdfBuffer = await generateWorkOrderReportPdf(wo);
  const safeName = wo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const subject = `Work Order Report: ${wo.title}`;
  const messageHtml = body.message ? `<p>${body.message}</p>` : "";
  const html = `<p>${session.user.name} shared a work order report with you.</p>${messageHtml}<p><strong>${wo.title}</strong></p><p>The full report is attached.</p>`;

  await Promise.all(
    recipients.map((r) =>
      sendEmailWithAttachment(r.email, subject, html, { filename: `work-order-${safeName}.pdf`, content: pdfBuffer })
    )
  );

  return NextResponse.json({ ok: true, sentTo: recipients.length });
}