import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assets = await prisma.asset.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only managers can add assets." }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name || !body.tag) {
    return NextResponse.json({ error: "Name and tag are required." }, { status: 400 });
  }
  const asset = await prisma.asset.create({
    data: { name: body.name, tag: body.tag, location: body.location || null, category: body.category || null },
  });
  return NextResponse.json(asset, { status: 201 });
}
