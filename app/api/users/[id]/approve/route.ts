import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, registrationApprovedEmail } from "@/lib/email";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { active: true, pendingApproval: false },
  });

  try {
    const { subject, html } = registrationApprovedEmail(user.name);
    await sendEmail(user.email, subject, html);
  } catch (err) {
    console.error("Approval email error:", err);
  }

  return NextResponse.json({ ok: true });
}