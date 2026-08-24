import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function requireManager(session: any) {
  return session && (session.user.role === "MANAGER" || session.user.role === "ADMIN");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!requireManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, active: true, createdAt: true,
      sites: { select: { site: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!requireManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) {
    return NextResponse.json({ error: "Name, email, and a password of at least 8 characters are required." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  const siteIds: string[] = Array.isArray(body.siteIds) ? body.siteIds : [];
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role || "REQUESTER",
      sites: siteIds.length > 0 ? { create: siteIds.map((siteId) => ({ siteId })) } : undefined,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
