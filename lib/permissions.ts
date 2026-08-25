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