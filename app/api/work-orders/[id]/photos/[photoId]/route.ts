import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export async function DELETE(_req: Request, { params }: { params: { id: string; photoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photo = await prisma.workOrderPhoto.findUnique({ where: { id: params.photoId } });
  if (!photo || photo.workOrderId !== params.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete = ["MANAGER", "ADMIN"].includes(session.user.role) || photo.uploadedById === session.user.id;
  if (!canDelete) return NextResponse.json({ error: "You can only remove photos you uploaded." }, { status: 403 });

  try {
    await del(photo.url);
  } catch (err) {
    console.error("Blob delete error:", err);
  }
  await prisma.workOrderPhoto.delete({ where: { id: params.photoId } });
  return NextResponse.json({ ok: true });
}