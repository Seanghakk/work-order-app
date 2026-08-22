import { prisma } from "@/lib/prisma";

export async function notifyUser(userId: string, message: string, workOrderId?: string) {
  try {
    await prisma.notification.create({ data: { userId, message, workOrderId } });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}