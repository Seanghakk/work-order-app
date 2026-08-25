import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSaleOrders, canAccessWorkOrders, getUserSiteIds, siteWhere } from "@/lib/permissions";
import BarChart from "@/components/BarChart";
import Link from "next/link";

const WO_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", ASSIGNED: "Assigned", IN_PROGRESS: "In progress",
  ON_HOLD: "On hold", COMPLETED: "Completed", CANCELED: "Canceled",
};
const PRIORITY_LABEL: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
const SO_STATUS_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry", DRAWING: "Drawing", BOQ: "BoQ", SUBMIT_TO_SALE: "Submit to Sale",
  CONFIRM_PO: "Confirm PO", CANCELLED: "Cancelled",
};

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;
  const siteIds = await getUserSiteIds(session!.user.id, role);
  const siteFilter = siteWhere(siteIds);

  const woWhere =
    role === "MAINTENANCE_TECHNICIAN" ? { OR: [{ assignedToId: session!.user.id }, { requestedById: session!.user.id }], ...siteFilter } :
    role === "REQUESTER" ? { requestedById: session!.user.id, ...siteFilter } :
    siteFilter;

  const [open, inProgress, overdue, completedThisWeek, woByStatus, woByPriority] = await Promise.all([
    prisma.workOrder.count({ where: { ...woWhere, status: "OPEN" } }),
    prisma.workOrder.count({ where: { ...woWhere, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.workOrder.count({ where: { ...woWhere, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELED"] } } }),
    prisma.workOrder.count({ where: { ...woWhere, status: "COMPLETED", completedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.workOrder.groupBy({ by: ["status"], where: woWhere, _count: true }),
    prisma.workOrder.groupBy({ by: ["priority"], where: woWhere, _count: true }),
  ]);

  const showSales = canAccessSaleOrders(role);
  let soPipeline = 0, soClosedThisMonth = 0, soPipelineValue = 0, soByStage: any[] = [];
  if (showSales) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [pipeline, closedThisMonth, valueAgg, byStage] = await Promise.all([
      prisma.saleOrder.count({ where: { status: { notIn: ["CONFIRM_PO", "CANCELLED"] } } }),
      prisma.saleOrder.count({ where: { status: "CONFIRM_PO", updatedAt: { gte: monthStart } } }),
      prisma.saleOrder.aggregate({ _sum: { value: true }, where: { status: { notIn: ["CONFIRM_PO", "CANCELLED"] } } }),
      prisma.saleOrder.groupBy({ by: ["status"], _count: true }),
    ]);
    soPipeline = pipeline;
    soClosedThisMonth = closedThisMonth;
    soPipelineValue = valueAgg._sum.value || 0;
    soByStage = byStage;
  }

  const woStatusChart = woByStatus.map((s) => ({ label: WO_STATUS_LABEL[s.status], value: s._count }));
  const woPriorityChart = woByPriority.map((p) => ({
    label: PRIORITY_LABEL[p.priority], value: p._count,
    color: p.priority === "URGENT" || p.priority === "HIGH" ? "var(--warning)" : "var(--navy)",
  }));
  const soStageChart = soByStage.map((s) => ({ label: SO_STATUS_LABEL[s.status], value: s._count }));

  return (
    <div className="container">
      <h1>Dashboard</h1>

      {canAccessWorkOrders(role) && (
      <>
      <h3>Work Orders</h3>
      <div className="stat-grid">
        <div className="card"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Open</div><div style={{ fontSize: 28, fontWeight: 600 }}>{open}</div></div>
        <div className="card"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>In progress</div><div style={{ fontSize: 28, fontWeight: 600 }}>{inProgress}</div></div>
        <div className="card"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Overdue</div><div style={{ fontSize: 28, fontWeight: 600 }}>{overdue}</div></div>
        <div className="card"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Completed this week</div><div style={{ fontSize: 28, fontWeight: 600 }}>{completedThisWeek}</div></div>
      </div>
      <div className="report-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>By status</h4>
          {woStatusChart.length > 0 ? <BarChart data={woStatusChart} /> : <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No work orders yet.</p>}
        </div>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>By priority</h4>
          {woPriorityChart.length > 0 ? <BarChart data={woPriorityChart} /> : <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No work orders yet.</p>}
        </div>
      </div>
      <Link href="/work-orders"><button className="primary">View work orders</button></Link>
      </>
      )}

      {showSales && (
        <>
          <h3 style={{ marginTop: 40 }}>Sale Orders</h3>
          <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="card"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Open pipeline</div><div style={{ fontSize: 28, fontWeight: 600 }}>{soPipeline}</div></div>
            <div className="card"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Closed this month</div><div style={{ fontSize: 28, fontWeight: 600 }}>{soClosedThisMonth}</div></div>
            <div className="card"><div style={{ fontSize: 13, color: "var(--text-muted)" }}>Pipeline value</div><div style={{ fontSize: 28, fontWeight: 600 }}>${soPipelineValue.toLocaleString()}</div></div>
          </div>
          <div className="card" style={{ marginBottom: 24 }}>
            <h4 style={{ marginTop: 0 }}>By stage</h4>
            {soStageChart.length > 0 ? <BarChart data={soStageChart} /> : <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No sale orders yet.</p>}
          </div>
          <Link href="/sale-orders"><button className="primary">View sale orders</button></Link>
        </>
      )}
    </div>
  );
}