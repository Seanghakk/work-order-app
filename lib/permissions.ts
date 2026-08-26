import { prisma } from "@/lib/prisma";

export function canAccessSaleOrders(role?: string | null): boolean {
  return [
    "SALES_LEADER", "SALES_ENGINEER",
    "SHOP_DRAWING_LEADER", "SHOP_DRAWING_ENGINEER",
    "ANA_LEADER", "ANA_ENGINEER",
    "QC_LEADER", "QC_ENGINEER",
    "MANAGER", "ADMIN",
  ].includes(role || "");
}

export function canAccessWorkOrders(role?: string | null): boolean {
  return ![
    "SHOP_DRAWING_LEADER", "SHOP_DRAWING_ENGINEER",
    "ANA_LEADER", "ANA_ENGINEER",
    "QC_LEADER", "QC_ENGINEER",
  ].includes(role || "");
}

export function canAccessServiceRequests(role?: string | null): boolean {
  return [
    "SALES_LEADER", "SALES_ENGINEER",
    "SHOP_DRAWING_LEADER", "SHOP_DRAWING_ENGINEER",
    "ANA_LEADER", "ANA_ENGINEER",
    "QC_LEADER", "QC_ENGINEER",
    "TNC_LEADER", "TNC_ENGINEER",
    "MAINTENANCE_LEADER", "MAINTENANCE_TECHNICIAN",
    "MANAGER", "ADMIN",
  ].includes(role || "");
}

// Was inlined separately in app/api/defect-reports/route.ts; hoisted here so the
// search endpoint can reuse the exact same rule instead of redefining it.
export function canAccessDefectReports(role?: string | null): boolean {
  return !!role && role !== "REQUESTER";
}

// Returns "ALL" for admins (no site restriction), or the list of site IDs this user is assigned to.
export async function getUserSiteIds(userId: string, role: string): Promise<string[] | "ALL"> {
  if (role === "ADMIN") return "ALL";
  const rows = await prisma.userSite.findMany({ where: { userId }, select: { siteId: true } });
  return rows.map((r) => r.siteId);
}

// Builds a Prisma "where" fragment for a model that has a direct siteId field.
export function siteWhere(siteIds: string[] | "ALL") {
  return siteIds === "ALL" ? {} : { siteId: { in: siteIds } };
}

// Returns the id of the team this user leads, or null if they don't lead any team.
export async function getLeaderTeamId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({ where: { teamLeaderId: userId }, select: { id: true } });
  return team?.id || null;
}

// Builds the same site/role/team-leader scoping Prisma "where" fragment used by
// GET /api/work-orders (see that route for the canonical shape this was extracted
// from). `extra` is merged into the base (site-scoped) where fragment — e.g. pass
// { archived: showArchived } — before the role-based OR (if any) is layered on top.
// Callers that need to AND this together with other conditions (e.g. a text search)
// should nest it as `{ AND: [scopingWhere, otherWhere] }` rather than spreading both
// into one object, since both may independently contain a top-level `OR` key.
export async function buildWorkOrderWhere(
  userId: string,
  role: string,
  extra: Record<string, any> = {}
) {
  const roleOr: any[] =
    role === "MAINTENANCE_TECHNICIAN" ? [{ assignedToId: userId }, { requestedById: userId }] :
    role === "REQUESTER" ? [{ requestedById: userId }] :
    [];
  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";

  const [leaderTeamId, siteIds] = await Promise.all([
    isManagerOrAdmin ? Promise.resolve(null) : getLeaderTeamId(userId),
    getUserSiteIds(userId, role),
  ]);
  if (leaderTeamId) roleOr.push({ teamId: leaderTeamId });

  const baseWhere: Record<string, any> = { ...siteWhere(siteIds), ...extra };
  return isManagerOrAdmin || roleOr.length === 0 ? baseWhere : { ...baseWhere, OR: roleOr };
}

// Builds the same site-scoping Prisma "where" fragment used by GET /api/assets.
export async function buildAssetWhere(userId: string, role: string, extra: Record<string, any> = {}) {
  const siteIds = await getUserSiteIds(userId, role);
  return { ...siteWhere(siteIds), ...extra };
}

// Builds the same site-scoping Prisma "where" fragment used by GET /api/defect-reports.
// DefectReport has no teamId/assignedToId, so unlike buildWorkOrderWhere there's no
// role-based OR to layer on — just site scoping. Unlike WorkOrder/Asset, DefectReport's
// siteId is nullable (site is optional on a report), so a report with no site set stays
// visible to every non-admin role too rather than disappearing for everyone but ADMIN —
// only `{ siteId: { in: siteIds } }` on its own would silently exclude those rows.
// Kept as its own named function (rather than reusing buildAssetWhere) so it can
// diverge independently if DefectReport later grows an assignee/team concept.
export async function buildDefectReportWhere(userId: string, role: string, extra: Record<string, any> = {}) {
  const siteIds = await getUserSiteIds(userId, role);
  if (siteIds === "ALL") return extra;
  return { ...extra, OR: [{ siteId: null }, { siteId: { in: siteIds } }] };
}

// Returns true if this user may edit "workflow" fields (status/assignedToId/teamId, plus
// dueDate on ServiceRequest) — or, for DefectReport, its items[] — on the given record.
// Allowed: the record's creator, its current assignee, a leader of its team (reusing
// getLeaderTeamId — same helper buildWorkOrderWhere already uses for team-leader
// visibility), or MANAGER/ADMIN. Shared by both modules' PATCH routes rather than
// duplicated, since the rule is identical for both. Content fields are NOT gated by
// this — they stay open to anyone who passes the module's base access check.
export async function canEditWorkflowFields(
  userId: string,
  role: string,
  record: { createdById: string; assignedToId?: string | null; teamId?: string | null }
): Promise<boolean> {
  if (role === "MANAGER" || role === "ADMIN") return true;
  if (record.createdById === userId) return true;
  if (record.assignedToId && record.assignedToId === userId) return true;
  if (record.teamId) {
    const leaderTeamId = await getLeaderTeamId(userId);
    if (leaderTeamId && leaderTeamId === record.teamId) return true;
  }
  return false;
}

// Narrower than canEditWorkflowFields on purpose: used for the Work Order approval
// workflow's gated transitions (approve/reject/sign-off/send-back/resubmit), which
// deliberately exclude the record's own creator/assignee — only a team leader or
// MANAGER/ADMIN may gate these, so nobody can approve or sign off their own work order.
export async function canApproveOrSignOff(userId: string, role: string, teamId: string | null): Promise<boolean> {
  if (role === "MANAGER" || role === "ADMIN") return true;
  if (!teamId) return false;
  const leaderTeamId = await getLeaderTeamId(userId);
  return leaderTeamId === teamId;
}
