import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendEmail, newRegistrationEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) {
    return NextResponse.json({ error: "Name, email, and a password of at least 8 characters are required." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: "REQUESTER",
      active: false,
      pendingApproval: true,
    },
  });

  try {
    const admin = await prisma.user.findUnique({ where: { email: "adtechbms@gmail.com" } });
    const { subject, html } = newRegistrationEmail(user.name, user.email);
    await sendEmail("adtechbms@gmail.com", subject, html);
    if (admin) {
      await notifyUser(admin.id, `${user.name} registered and is waiting for approval`, "/users");
    }
  } catch (err) {
    console.error("Registration notification error:", err);
  }

  return NextResponse.json({ ok: true });
}