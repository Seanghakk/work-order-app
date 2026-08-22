import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [byStatus, byPriority, workOrders] = await Promise.all([
    prisma.workOrder.groupBy({ by: ["status"], _count: true }),
    prisma.workOrder.groupBy({ by: ["priority"], _count: true }),
    prisma.workOrder.findMany({
      include: { asset: true, assignedTo: true, requestedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const completed = workOrders.filter((w) => w.status === "COMPLETED" && w.completedAt);
  const avgHours = completed.length
    ? completed.reduce((sum, w) => sum + (w.completedAt!.getTime() - w.createdAt.getTime()), 0) / completed.length / 3600000
    : 0;
  const overdue = workOrders.filter((w) => w.dueDate && w.dueDate < new Date() && w.status !== "COMPLETED" && w.status !== "CANCELED").length;

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Report generated", new Date().toLocaleString()],
    [],
    ["By status"],
    ...byStatus.map((s) => [s.status, s._count]),
    [],
    ["By priority"],
    ...byPriority.map((p) => [p.priority, p._count]),
    [],
    ["Average time to close (hours)", avgHours.toFixed(1)],
    ["Overdue right now", overdue],
  ]);

  const workOrderRows = workOrders.map((w) => ({
    Title: w.title,
    Status: w.status,
    Priority: w.priority,
    Asset: w.asset?.name || "",
    "Requested by": w.requestedBy.name,
    "Assigned to": w.assignedTo?.name || "",
    Created: w.createdAt.toLocaleString(),
    "Due date": w.dueDate ? w.dueDate.toLocaleString() : "",
    "Completed at": w.completedAt ? w.completedAt.toLocaleString() : "",
  }));
  const workOrderSheet = XLSX.utils.json_to_sheet(workOrderRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, workOrderSheet, "Work orders");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="work-order-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}