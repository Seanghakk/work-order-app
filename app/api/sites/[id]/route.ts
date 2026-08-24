import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can edit sites." }, { status: 401 });
  }
  const body = await req.json();
  const data: any = {};
  if (body.name?.trim()) data.name = body.name;
  if (body.address !== undefined) data.address = body.address || null;
  if (typeof body.active === "boolean") data.active = body.active;
  const site = await prisma.site.update({ where: { id: params.id }, data });
  return NextResponse.json(site);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can delete sites." }, { status: 401 });
  }
  try {
    await prisma.site.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "This site has assets, work orders, or sale orders linked to it and can't be deleted." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
