import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function requireManager(session: any) {
  return session && (session.user.role === "MANAGER" || session.user.role === "ADMIN");
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!requireManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  if (body.name?.trim()) data.name = body.name;
  if (body.email?.trim()) {
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
    }
    data.email = body.email;
  }
  if (body.username !== undefined) {
    const trimmed = body.username?.trim() || null;
    if (trimmed) {
      const existingUsername = await prisma.user.findUnique({ where: { username: trimmed } });
      if (existingUsername && existingUsername.id !== params.id) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 400 });
      }
    }
    data.username = trimmed;
  }
  if (body.role) data.role = body.role;
  if (typeof body.active === "boolean") {
    // Deactivation is now the sole "remove this user" mechanism — this app used to
    // also expose a hard DELETE here, but a genuine delete can silently succeed for
    // a user with zero history and permanently destroy the row, while orphaning
    // audit trail integrity for anyone with real history. Removed in favor of this
    // path alone, which carries the same two guards the old DELETE route had: can't
    // act on your own account, and the protected system account can't be touched.
    if (body.active === false) {
      if (session!.user.id === params.id) {
        return NextResponse.json({ error: "You can't deactivate your own account." }, { status: 400 });
      }
      const target = await prisma.user.findUnique({ where: { id: params.id } });
      if (target?.email === "adtechbms@gmail.com") {
        return NextResponse.json({ error: "This account is protected and can't be deactivated." }, { status: 403 });
      }
    }
    data.active = body.active;
  }
  if (body.teamId !== undefined) data.teamId = body.teamId || null;
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return NextResponse.json(user);
}