import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { canAccessSaleOrders, canAccessWorkOrders, getUserSiteIds, siteWhere } from "@/lib/permissions";
import { DonutChart, TrendChart } from "@/components/DashboardCharts";
import Link from "next/link";

const WO_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", ASSIGNED: "Assigned", IN_PROGRESS: "In progress",
  ON_HOLD: "On hold", COMPLETED: "Completed", CANCELED: "Canceled",
};
const WO_STATUS_COLOR: Record<string, string> = {
  OPEN: "#0e5c86", ASSIGNED: "#0f9488", IN_PROGRESS: "#d97706",
  ON_HOLD: "#5b6b7a", COMPLETED: "#16a34a", CANCELED: "#c62430",
};
const PRIORITY_LABEL: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
const PRIORITY_COLOR: Record<string, string> = { LOW: "#5b6b7a", MEDIUM: "#0e5c86", HIGH: "#d97706", URGENT: "#c62430" };
const SO_STATUS_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry", DRAWING: "Drawing", BOQ: "BoQ", SUBMIT_TO_SALE: "Submit to Sale",
  CONFIRM_PO: "Confirm PO", CANCELLED: "Cancelled",
};
const SO_STATUS_COLOR: Record<string, string> = {
  INQUIRY: "#5b6b7a", DRAWING: "#0e5c86", BOQ: "#0f9488",
  SUBMIT_TO_SALE: "#d97706", CONFIRM_PO: "#16a34a", CANCELLED: "#c62430",
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

  let weeklyTrendRaw: { week: Date; count: number }[] = [];
  if (canAccessWorkOrders(role)) {
    let condition = Prisma.sql`"createdAt" >= NOW() - INTERVAL '8 weeks'`;
    if (role === "MAINTENANCE_TECHNICIAN") {
      condition = Prisma.sql`${condition} AND ("assignedToId" = ${session!.user.id} OR "requestedById" = ${session!.user.id})`;
    } else if (role === "REQUESTER") {
      condition = Prisma.sql`${condition} AND "requestedById" = ${session!.user.id}`;
    }
    if (siteIds !== "ALL") {
      condition = siteIds.length === 0
        ? Prisma.sql`${condition} AND FALSE`
        : Prisma.sql`${condition} AND "siteId" IN (${Prisma.join(siteIds)})`;
    }
    weeklyTrendRaw = await prisma.$queryRaw<{ week: Date; count: number }[]>(
      Prisma.sql`SELECT date_trunc('week', "createdAt") as week, COUNT(*)::int as count FROM "WorkOrder" WHERE ${condition} GROUP BY week ORDER BY week ASC`
    );
  }
  const trendChartData = weeklyTrendRaw.map((w) => ({
    label: new Date(w.week).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: Number(w.count),
  }));

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

  const woStatusChart = woByStatus.map((s) => ({ label: WO_STATUS_LABEL[s.status], value: s._count, color: WO_STATUS_COLOR[s.status] }));
  const woPriorityChart = woByPriority.map((p) => ({ label: PRIORITY_LABEL[p.priority], value: p._count, color: PRIORITY_COLOR[p.priority] }));
  const soStageChart = soByStage.map((s) => ({ label: SO_STATUS_LABEL[s.status], value: s._count, color: SO_STATUS_COLOR[s.status] }));

  return (
    <div className="container">
      <span className="eyebrow">Overview</span>
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
      {trendChartData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h4 style={{ marginTop: 0 }}>Created - last 8 weeks</h4>
          <TrendChart data={trendChartData} />
        </div>
      )}
      <div className="report-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>By status</h4>
          {woStatusChart.length > 0 ? <DonutChart data={woStatusChart} /> : <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No work orders yet.</p>}
        </div>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>By priority</h4>
          {woPriorityChart.length > 0 ? <DonutChart data={woPriorityChart} /> : <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No work orders yet.</p>}
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
            {soStageChart.length > 0 ? <DonutChart data={soStageChart} /> : <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No sale orders yet.</p>}
          </div>
          <Link href="/sale-orders"><button className="primary">View sale orders</button></Link>
        </>
      )}
    </div>
  );
}