import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { canAccessSaleOrders, canAccessWorkOrders, getUserSiteIds, siteWhere, getLeaderTeamIds } from "@/lib/permissions";
import { DonutChart, TrendChart } from "@/components/DashboardCharts";
import Link from "next/link";

const WO_STATUS_LABEL: Record<string, string> = {
  OPEN: "Requested", PENDING_APPROVAL: "Pending approval", APPROVED: "Approved",
  ASSIGNED: "Assigned", IN_PROGRESS: "In progress", PENDING_SIGNOFF: "Pending sign-off",
  COMPLETED: "Completed", ON_HOLD: "On hold", CANCELED: "Canceled",
};
const WO_STATUS_COLOR: Record<string, string> = {
  OPEN: "#0e5c86", PENDING_APPROVAL: "#eab308", APPROVED: "#0891b2",
  ASSIGNED: "#0f9488", IN_PROGRESS: "#d97706", PENDING_SIGNOFF: "#ea580c",
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

const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 86400000);

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

type ActionListRow = { id: string; title: string; site: string | null; person: string | null };

function ActionQueueCard({ title, emptyLabel, count, rows, personLabel }: { title: string; emptyLabel: string; count: number; rows: ActionListRow[]; personLabel: string }) {
  return (
    <div className="card">
      <h4 style={{ marginTop: 0 }}>{title} ({count})</h4>
      {rows.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <Link key={r.id} href={`/work-orders/${r.id}`} style={{ display: "block" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {personLabel}: {r.person || "—"} · {r.site || "—"}
              </div>
            </Link>
          ))}
          {count > rows.length && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>+{count - rows.length} more</span>
          )}
        </div>
      )}
    </div>
  );
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;
  const userId = session!.user.id;
  const siteIds = await getUserSiteIds(userId, role);
  const siteFilter = siteWhere(siteIds);

  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";
  const isRequester = role === "REQUESTER";
  // "Leader" is determined by actually leading at least one team (teamLeaderId data),
  // not by role name — a *_LEADER-titled user who isn't set as any team's leader gets
  // the plain personal-work view, matching what canApproveOrSignOff would actually allow.
  const leaderTeamIds = !isRequester && !isManagerOrAdmin ? await getLeaderTeamIds(userId) : [];
  const isLeader = leaderTeamIds.length > 0;

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
  const soStageChart = soByStage.map((s) => ({ label: SO_STATUS_LABEL[s.status], value: s._count, color: SO_STATUS_COLOR[s.status] }));

  return (
    <div className="container">
      <span className="eyebrow">Overview</span>
      <h1>Dashboard</h1>

      {canAccessWorkOrders(role) && (
        <>
          <h3>Work Orders</h3>

          {isRequester && <RequesterView userId={userId} siteFilter={siteFilter} />}
          {!isRequester && !isManagerOrAdmin && !isLeader && <PersonalWorkView userId={userId} siteFilter={siteFilter} />}
          {isLeader && <LeaderView userId={userId} leaderTeamIds={leaderTeamIds} siteFilter={siteFilter} />}
          {isManagerOrAdmin && <ManagerView siteFilter={siteFilter} siteIds={siteIds} />}

          <div style={{ marginTop: 16 }}>
            <Link href="/work-orders"><button className="primary">View work orders</button></Link>
          </div>
        </>
      )}

      {showSales && (
        <>
          <h3 style={{ marginTop: 40 }}>Sale Orders</h3>
          <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <StatCard label="Open pipeline" value={soPipeline} />
            <StatCard label="Closed this month" value={soClosedThisMonth} />
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

// === REQUESTER: 4 simple cards, unchanged in spirit from before ===
async function RequesterView({ userId, siteFilter }: { userId: string; siteFilter: Record<string, any> }) {
  const myWhere = { requestedById: userId, ...siteFilter };
  const [awaitingApproval, inProgress, completedThisWeek, overdue] = await Promise.all([
    prisma.workOrder.count({ where: { ...myWhere, status: "PENDING_APPROVAL" } }),
    prisma.workOrder.count({ where: { ...myWhere, status: { in: ["APPROVED", "ASSIGNED", "IN_PROGRESS", "PENDING_SIGNOFF"] } } }),
    prisma.workOrder.count({ where: { ...myWhere, status: "COMPLETED", completedAt: { gte: SEVEN_DAYS_AGO() } } }),
    prisma.workOrder.count({ where: { ...myWhere, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELED"] } } }),
  ]);
  return (
    <div className="stat-grid">
      <StatCard label="Awaiting approval" value={awaitingApproval} />
      <StatCard label="In progress" value={inProgress} />
      <StatCard label="Completed this week" value={completedThisWeek} />
      <StatCard label="Overdue" value={overdue} />
    </div>
  );
}

// === MAINTENANCE_TECHNICIAN and other non-leader, non-manager roles: their own assigned work ===
async function PersonalWorkView({ userId, siteFilter }: { userId: string; siteFilter: Record<string, any> }) {
  const assignedWhere = { assignedToId: userId, ...siteFilter };
  const [readyToStart, inProgress, awaitingSignoff, overdue] = await Promise.all([
    prisma.workOrder.count({ where: { ...assignedWhere, status: "APPROVED" } }),
    prisma.workOrder.count({ where: { ...assignedWhere, status: "IN_PROGRESS" } }),
    prisma.workOrder.count({ where: { ...assignedWhere, status: "PENDING_SIGNOFF" } }),
    prisma.workOrder.count({
      where: { OR: [{ assignedToId: userId }, { requestedById: userId }], ...siteFilter, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELED"] } },
    }),
  ]);
  return (
    <div className="stat-grid">
      <StatCard label="Ready to start" value={readyToStart} />
      <StatCard label="In progress" value={inProgress} />
      <StatCard label="Awaiting sign-off" value={awaitingSignoff} />
      <StatCard label="Overdue" value={overdue} />
    </div>
  );
}

// === Team leaders: "needs your action" queue (scoped to teams they actually lead,
// via getLeaderTeamIds so multi-team leaders see every team's items), plus their own
// assigned work if they also do hands-on work ===
async function LeaderView({ userId, leaderTeamIds, siteFilter }: { userId: string; leaderTeamIds: string[]; siteFilter: Record<string, any> }) {
  const leaderWhere = { teamId: { in: leaderTeamIds }, ...siteFilter };
  const listSelect = {
    id: true, title: true,
    site: { select: { name: true } },
    requestedBy: { select: { name: true } },
    assignedTo: { select: { name: true } },
  };
  const [pendingApprovalCount, pendingSignoffCount, pendingApprovalRows, pendingSignoffRows, myAssignedTotal] = await Promise.all([
    prisma.workOrder.count({ where: { ...leaderWhere, status: "PENDING_APPROVAL" } }),
    prisma.workOrder.count({ where: { ...leaderWhere, status: "PENDING_SIGNOFF" } }),
    prisma.workOrder.findMany({ where: { ...leaderWhere, status: "PENDING_APPROVAL" }, select: listSelect, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.workOrder.findMany({ where: { ...leaderWhere, status: "PENDING_SIGNOFF" }, select: listSelect, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.workOrder.count({ where: { assignedToId: userId, ...siteFilter, status: { notIn: ["COMPLETED", "CANCELED"] } } }),
  ]);

  return (
    <>
      <h4>Needs your action</h4>
      <div className="report-grid" style={{ marginBottom: 24 }}>
        <ActionQueueCard
          title="Pending your approval"
          emptyLabel="Nothing waiting on your approval."
          count={pendingApprovalCount}
          rows={pendingApprovalRows.map((r) => ({ id: r.id, title: r.title, site: r.site?.name || null, person: r.requestedBy?.name || null }))}
          personLabel="Requested by"
        />
        <ActionQueueCard
          title="Pending your sign-off"
          emptyLabel="Nothing waiting on your sign-off."
          count={pendingSignoffCount}
          rows={pendingSignoffRows.map((r) => ({ id: r.id, title: r.title, site: r.site?.name || null, person: r.assignedTo?.name || null }))}
          personLabel="Assigned to"
        />
      </div>

      {myAssignedTotal > 0 && (
        <>
          <h4>Your assigned work</h4>
          <PersonalWorkView userId={userId} siteFilter={siteFilter} />
        </>
      )}
    </>
  );
}

// === MANAGER/ADMIN: needs-your-action (site-scoped, since they can act on anything),
// plus the existing full overview ===
async function ManagerView({ siteFilter, siteIds }: { siteFilter: Record<string, any>; siteIds: string[] | "ALL" }) {
  const listSelect = {
    id: true, title: true,
    site: { select: { name: true } },
    requestedBy: { select: { name: true } },
    assignedTo: { select: { name: true } },
  };
  const [
    pendingApprovalCount, pendingSignoffCount, pendingApprovalRows, pendingSignoffRows,
    open, inProgress, overdue, completedThisWeek, woByStatus, woByPriority,
  ] = await Promise.all([
    prisma.workOrder.count({ where: { ...siteFilter, status: "PENDING_APPROVAL" } }),
    prisma.workOrder.count({ where: { ...siteFilter, status: "PENDING_SIGNOFF" } }),
    prisma.workOrder.findMany({ where: { ...siteFilter, status: "PENDING_APPROVAL" }, select: listSelect, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.workOrder.findMany({ where: { ...siteFilter, status: "PENDING_SIGNOFF" }, select: listSelect, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.workOrder.count({ where: { ...siteFilter, status: "OPEN" } }),
    prisma.workOrder.count({ where: { ...siteFilter, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.workOrder.count({ where: { ...siteFilter, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELED"] } } }),
    prisma.workOrder.count({ where: { ...siteFilter, status: "COMPLETED", completedAt: { gte: SEVEN_DAYS_AGO() } } }),
    prisma.workOrder.groupBy({ by: ["status"], where: siteFilter, _count: true }),
    prisma.workOrder.groupBy({ by: ["priority"], where: siteFilter, _count: true }),
  ]);

  let weeklyTrendRaw: { week: Date; count: number }[] = [];
  let condition = Prisma.sql`"createdAt" >= NOW() - INTERVAL '8 weeks'`;
  if (siteIds !== "ALL") {
    condition = siteIds.length === 0
      ? Prisma.sql`${condition} AND FALSE`
      : Prisma.sql`${condition} AND "siteId" IN (${Prisma.join(siteIds)})`;
  }
  weeklyTrendRaw = await prisma.$queryRaw<{ week: Date; count: number }[]>(
    Prisma.sql`SELECT date_trunc('week', "createdAt") as week, COUNT(*)::int as count FROM "WorkOrder" WHERE ${condition} GROUP BY week ORDER BY week ASC`
  );
  const trendChartData = weeklyTrendRaw.map((w) => ({
    label: new Date(w.week).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: Number(w.count),
  }));

  const woStatusChart = woByStatus.map((s) => ({ label: WO_STATUS_LABEL[s.status], value: s._count, color: WO_STATUS_COLOR[s.status] }));
  const woPriorityChart = woByPriority.map((p) => ({ label: PRIORITY_LABEL[p.priority], value: p._count, color: PRIORITY_COLOR[p.priority] }));

  return (
    <>
      <h4>Needs your action</h4>
      <div className="report-grid" style={{ marginBottom: 24 }}>
        <ActionQueueCard
          title="Pending approval"
          emptyLabel="Nothing waiting on approval."
          count={pendingApprovalCount}
          rows={pendingApprovalRows.map((r) => ({ id: r.id, title: r.title, site: r.site?.name || null, person: r.requestedBy?.name || null }))}
          personLabel="Requested by"
        />
        <ActionQueueCard
          title="Pending sign-off"
          emptyLabel="Nothing waiting on sign-off."
          count={pendingSignoffCount}
          rows={pendingSignoffRows.map((r) => ({ id: r.id, title: r.title, site: r.site?.name || null, person: r.assignedTo?.name || null }))}
          personLabel="Assigned to"
        />
      </div>

      <h4>Overview</h4>
      <div className="stat-grid">
        <StatCard label="Open" value={open} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Overdue" value={overdue} />
        <StatCard label="Completed this week" value={completedThisWeek} />
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
    </>
  );
}
