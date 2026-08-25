import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can edit teams." }, { status: 401 });
  }
  const body = await req.json();
  const data: any = {};
  if (body.teamLeaderId !== undefined) data.teamLeaderId = body.teamLeaderId || null;
  if (body.colorHex) data.colorHex = body.colorHex;
  const team = await prisma.team.update({ where: { id: params.id }, data });
  return NextResponse.json(team);
}