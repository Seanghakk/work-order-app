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

// Returns the ids of every team this user leads (a user can lead more than one —
// User.leadingTeams is an array, nothing in the schema limits it to one). Every
// authorization-critical caller (canEditWorkflowFields, canApproveOrSignOff,
// buildWorkOrderWhere) uses this rather than a single-team lookup, so a user leading
// multiple teams is correctly authorized/scoped for all of them, not just one.
export async function getLeaderTeamIds(userId: string): Promise<string[]> {
  const teams = await prisma.team.findMany({ where: { teamLeaderId: userId }, select: { id: true } });
  return teams.map((t) => t.id);
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

  const [leaderTeamIds, siteIds] = await Promise.all([
    isManagerOrAdmin ? Promise.resolve([]) : getLeaderTeamIds(userId),
    getUserSiteIds(userId, role),
  ]);
  if (leaderTeamIds.length > 0) roleOr.push({ teamId: { in: leaderTeamIds } });

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

// Builds the same site-scoping Prisma "where" fragment used by GET /api/service-requests.
// ServiceRequest's siteId is nullable exactly like DefectReport's (site is optional on a
// request), so a request with no site set stays visible to every allowed role rather than
// disappearing for everyone but ADMIN. Previously this route had no site scoping at all —
// every role passing canAccessServiceRequests saw every site's requests.
export async function buildServiceRequestWhere(userId: string, role: string, extra: Record<string, any> = {}) {
  const siteIds = await getUserSiteIds(userId, role);
  if (siteIds === "ALL") return extra;
  return { ...extra, OR: [{ siteId: null }, { siteId: { in: siteIds } }] };
}

// Returns true if this user may access the given record's site — "ALL" (admin) or the site
// is in their assigned list. A null siteId (a record with no site set, e.g. a ServiceRequest
// or DefectReport created without one) is always accessible, matching buildServiceRequestWhere
// / buildDefectReportWhere's treatment of unset sites. Shared by the WorkOrder, ServiceRequest,
// and photo-upload single-record routes rather than duplicated per file.
export async function checkSiteAccess(userId: string, role: string, siteId: string | null): Promise<boolean> {
  if (!siteId) return true;
  const siteIds = await getUserSiteIds(userId, role);
  return siteIds === "ALL" || siteIds.includes(siteId);
}

// Returns true if this user may edit "workflow" fields (status/assignedToId/teamId, plus
// dueDate on ServiceRequest) — or, for DefectReport, its items[] — on the given record.
// Allowed: the record's creator, its current assignee, a leader of its team (via
// getLeaderTeamIds, so this is correct for a user leading more than one team), or
// MANAGER/ADMIN. Shared by both modules' PATCH routes rather than duplicated, since the
// rule is identical for both. Content fields are NOT gated by this — they stay open to
// anyone who passes the module's base access check.
export async function canEditWorkflowFields(
  userId: string,
  role: string,
  record: { createdById: string; assignedToId?: string | null; teamId?: string | null }
): Promise<boolean> {
  if (role === "MANAGER" || role === "ADMIN") return true;
  if (record.createdById === userId) return true;
  if (record.assignedToId && record.assignedToId === userId) return true;
  if (record.teamId) {
    const leaderTeamIds = await getLeaderTeamIds(userId);
    if (leaderTeamIds.includes(record.teamId)) return true;
  }
  return false;
}

// Narrower than canEditWorkflowFields on purpose: used for the Work Order approval
// workflow's gated transitions (approve/reject/sign-off/send-back/resubmit), which
// deliberately exclude the record's own creator/assignee — only a team leader or
// MANAGER/ADMIN may gate these, so nobody can approve or sign off their own work order.
// Uses getLeaderTeamIds so a user leading more than one team is correctly authorized
// for all of them, not just whichever one a single-team lookup happened to return.
export async function canApproveOrSignOff(userId: string, role: string, teamId: string | null): Promise<boolean> {
  if (role === "MANAGER" || role === "ADMIN") return true;
  if (!teamId) return false;
  const leaderTeamIds = await getLeaderTeamIds(userId);
  return leaderTeamIds.includes(teamId);
}

// Narrower than canEditWorkflowFields, and the mirror-opposite of canApproveOrSignOff:
// used for the Work Order actions the assignee performs on their own work (starting it,
// marking it ready for sign-off) — here we WANT the assignee to trigger these
// themselves, unlike canApproveOrSignOff which deliberately excludes the record's own
// creator/assignee. Allowed: the current assignee, a leader of the record's team (via
// getLeaderTeamIds, so a user leading more than one team is correctly authorized for
// all of them), or MANAGER/ADMIN. The record's creator gets no special carve-out here
// unless they're also the assignee or a leader.
export async function canStartOrSubmitWork(
  userId: string,
  role: string,
  workOrder: { assignedToId: string | null; teamId: string | null }
): Promise<boolean> {
  if (role === "MANAGER" || role === "ADMIN") return true;
  if (workOrder.assignedToId && workOrder.assignedToId === userId) return true;
  if (workOrder.teamId) {
    const leaderTeamIds = await getLeaderTeamIds(userId);
    if (leaderTeamIds.includes(workOrder.teamId)) return true;
  }
  return false;
}
