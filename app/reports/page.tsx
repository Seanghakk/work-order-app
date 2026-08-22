import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const [byStatus, byPriority, completed, overdue] = await Promise.all([
    prisma.workOrder.groupBy({ by: ["status"], _count: true }),
    prisma.workOrder.groupBy({ by: ["priority"], _count: true }),
    prisma.workOrder.findMany({ where: { status: "COMPLETED", completedAt: { not: null } }, select: { createdAt: true, completedAt: true } }),
    prisma.workOrder.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELED"] } } }),
  ]);

  const avgHours = completed.length
    ? completed.reduce((sum, w) => sum + (w.completedAt!.getTime() - w.createdAt.getTime()), 0) / completed.length / 3600000
    : 0;

  return (
    <div className="container">
      <h1>Reports</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <h3>By status</h3>
          {byStatus.map((s) => (
            <div key={s.status} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>{s.status.replace("_", " ")}</span><span>{s._count}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>By priority</h3>
          {byPriority.map((p) => (
            <div key={p.priority} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>{p.priority}</span><span>{p._count}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Average time to close</h3>
          <p style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{avgHours.toFixed(1)} hrs</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Based on {completed.length} completed work orders.</p>
        </div>
        <div className="card">
          <h3>Overdue right now</h3>
          <p style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{overdue}</p>
        </div>
      </div>
    </div>
  );
}
