import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, position: true, signatureUrl: true, telegramChatId: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    name: user.name,
    username: user.username,
    position: user.position,
    signatureUrl: user.signatureUrl,
    telegramConnected: !!user.telegramChatId,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: any = {};
  if (body.name?.trim()) data.name = body.name;
  if (body.username !== undefined) {
    const trimmed = body.username?.trim() || null;
    if (trimmed) {
      const existing = await prisma.user.findUnique({ where: { username: trimmed } });
      if (existing && existing.id !== session.user.id) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 400 });
      }
    }
    data.username = trimmed;
  }
  if (body.position !== undefined) data.position = body.position?.trim() || null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { name: true, username: true, position: true },
  });
  return NextResponse.json(user);
}