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
  if (body.role) data.role = body.role;
  if (typeof body.active === "boolean") data.active = body.active;
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!requireManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.id === params.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (target?.email === "adtechbms@gmail.com") {
    return NextResponse.json({ error: "This account is protected and can't be deleted." }, { status: 403 });
  }
  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "This user has existing work orders or comments and can't be deleted. Change their role instead, or reassign their work orders first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Something went wrong removing this user." }, { status: 500 });
  }
}