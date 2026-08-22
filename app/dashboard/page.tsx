import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;
  const where =
    role === "TECHNICIAN" ? { assignedToId: session!.user.id } :
    role === "REQUESTER" ? { requestedById: session!.user.id } :
    {};

  const [open, inProgress, overdue, completedThisWeek] = await Promise.all([
    prisma.workOrder.count({ where: { ...where, status: "OPEN" } }),
    prisma.workOrder.count({ where: { ...where, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.workOrder.count({ where: { ...where, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELED"] } } }),
    prisma.workOrder.count({ where: { ...where, status: "COMPLETED", completedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
  ]);

  const stats = [
    { label: "Open", value: open },
    { label: "In progress", value: inProgress },
    { label: "Overdue", value: overdue },
    { label: "Completed this week", value: completedThisWeek },
  ];

  return (
    <div className="container">
      <h1>Dashboard</h1>
       <div className="stat-grid">
        {stats.map((s) => (
          <div className="card" key={s.label}>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <Link href="/work-orders"><button className="primary">View work orders</button></Link>
    </div>
  );
}
