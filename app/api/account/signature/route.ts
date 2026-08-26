import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

// Mirrors app/api/work-orders/[id]/photos/route.ts's upload pattern exactly, just
// scoped to the current user's own profile instead of a work order's photo gallery.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File is too large (10MB max)." }, { status: 400 });
  }

  const blob = await put(`users/${session.user.id}/signature-${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { signatureUrl: blob.url },
    select: { signatureUrl: true },
  });
  return NextResponse.json(user, { status: 201 });
}
