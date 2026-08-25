import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailWithAttachment } from "@/lib/email";
import { generateMaterialRequisitionPdf } from "@/lib/materialRequisitionPdf";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "REQUESTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
  if (userIds.length === 0) {
    return NextResponse.json({ error: "Select at least one recipient." }, { status: 400 });
  }

  const requisition = await prisma.materialRequisition.findUnique({
    where: { id: params.id },
    include: { createdBy: true, items: { orderBy: { itemNo: "asc" } } },
  });
  if (!requisition) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recipients = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { email: true, name: true } });
  if (recipients.length === 0) return NextResponse.json({ error: "No valid recipients found." }, { status: 400 });

  const pdfBuffer = await generateMaterialRequisitionPdf(requisition);
  const safeName = (requisition.referenceNo || requisition.projectName || "requisition").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const subject = `Material Requisition: ${requisition.referenceNo || requisition.projectName || requisition.id.slice(-8).toUpperCase()}`;
  const messageHtml = body.message ? `<p>${body.message}</p>` : "";
  const html = `<p>${session.user.name} shared a material requisition with you.</p>${messageHtml}<p>The full form is attached.</p>`;

  await Promise.all(
    recipients.map((r) =>
      sendEmailWithAttachment(r.email, subject, html, { filename: `material-requisition-${safeName}.pdf`, content: pdfBuffer })
    )
  );

  return NextResponse.json({ ok: true, sentTo: recipients.length });
}