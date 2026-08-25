import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

const CAN_UPLOAD = ["MANAGER", "ADMIN", "MAINTENANCE_LEADER", "MAINTENANCE_TECHNICIAN"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !CAN_UPLOAD.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workOrder = await prisma.workOrder.findUnique({ where: { id: params.id } });
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File is too large (10MB max)." }, { status: 400 });
  }

  const blob = await put(`work-orders/${params.id}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  const photo = await prisma.workOrderPhoto.create({
    data: {
      workOrderId: params.id,
      url: blob.url,
      fileName: file.name,
      uploadedById: session.user.id,
    },
  });
  return NextResponse.json(photo, { status: 201 });
}