import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessWorkOrders,
  canAccessServiceRequests,
  canAccessDefectReports,
  buildWorkOrderWhere,
  buildDefectReportWhere,
  buildAssetWhere,
} from "@/lib/permissions";

// Default result count per category for the nav dropdown; the /search page asks
// for a larger `limit` explicitly.
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

const ci = { mode: "insensitive" as const };

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const requestedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const empty = { workOrders: [], serviceRequests: [], defectReports: [], assets: [] };
  if (q.length < 2) return NextResponse.json(empty);

  const role = session.user.role;
  const userId = session.user.id;

  // Each branch below reuses the exact same permission gate + scoping "where" that
  // the corresponding module's own list route (GET /api/work-orders, /api/service-
  // requests, /api/defect-reports, /api/assets) already applies — see the summary
  // for exactly where each one was found/extracted from. The search-term match is
  // nested under a separate `AND` entry rather than spread into the same object,
  // because the scoping where can itself contain a top-level `OR` (role-based
  // access) that a spread-in text-search `OR` would silently overwrite.

  const [workOrders, serviceRequests, defectReports, assets] = await Promise.all([
    // Reused from GET /api/work-orders (app/api/work-orders/route.ts), now
    // extracted into lib/permissions.ts#buildWorkOrderWhere.
    canAccessWorkOrders(role)
      ? prisma.workOrder.findMany({
          where: {
            AND: [
              await buildWorkOrderWhere(userId, role, { archived: false }),
              { OR: [{ title: { contains: q, ...ci } }, { soNumber: { contains: q, ...ci } }] },
            ],
          },
          select: { id: true, title: true, soNumber: true, status: true, approvedById: true, site: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]),

    // Reused from GET /api/service-requests (app/api/service-requests/route.ts):
    // canAccessServiceRequests as the permission gate, and `{ archived: false }` as
    // the only where-scoping that route applies.
    canAccessServiceRequests(role)
      ? prisma.serviceRequest.findMany({
          where: {
            AND: [
              { archived: false },
              { OR: [{ title: { contains: q, ...ci } }, { soNumber: { contains: q, ...ci } }] },
            ],
          },
          select: { id: true, title: true, soNumber: true, status: true, customerName: true, site: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]),

    // Reused from GET /api/defect-reports (app/api/defect-reports/route.ts):
    // canAccessDefectReports as the permission gate, and buildDefectReportWhere as
    // the site-scoping where — same shape as the Work Orders/Assets branches above.
    canAccessDefectReports(role)
      ? prisma.defectReport.findMany({
          where: {
            AND: [
              await buildDefectReportWhere(userId, role),
              { OR: [{ projectName: { contains: q, ...ci } }, { dfNumber: { contains: q, ...ci } }] },
            ],
          },
          select: { id: true, projectName: true, dfNumber: true, status: true, site: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]),

    // Reused from GET /api/assets (app/api/assets/route.ts): that route gates on
    // canAccessWorkOrders (not a dedicated "canAccessAssets"), so search does too,
    // and site-scopes via the same helper, now extracted as buildAssetWhere.
    canAccessWorkOrders(role)
      ? prisma.asset.findMany({
          where: {
            AND: [
              await buildAssetWhere(userId, role),
              { OR: [{ name: { contains: q, ...ci } }, { tag: { contains: q, ...ci } }] },
            ],
          },
          select: { id: true, name: true, tag: true, status: true, site: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: limit,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    workOrders: workOrders.map((w) => ({
      id: w.id,
      title: w.title,
      soNumber: w.soNumber,
      status: w.status,
      approvedById: w.approvedById,
      site: w.site?.name || null,
      href: `/work-orders/${w.id}`,
    })),
    serviceRequests: serviceRequests.map((s) => ({
      id: s.id,
      title: s.title,
      soNumber: s.soNumber,
      status: s.status,
      customerName: s.customerName,
      site: s.site?.name || null,
      href: `/service-requests/${s.id}`,
    })),
    defectReports: defectReports.map((d) => ({
      id: d.id,
      title: d.projectName,
      soNumber: d.dfNumber,
      status: d.status,
      site: d.site?.name || null,
      href: `/defect-reports/${d.id}`,
    })),
    // Assets have no dedicated detail page in this app — the list page (/assets)
    // is the only place to view one, so every asset result links there.
    assets: assets.map((a) => ({
      id: a.id,
      title: a.name,
      soNumber: a.tag,
      status: a.status,
      site: a.site?.name || null,
      href: `/assets`,
    })),
  });
}
