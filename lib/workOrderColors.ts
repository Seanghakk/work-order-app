// Unified status/priority palette for Work Orders — reuses the app's existing
// theme colors (see :root in globals.css) instead of one-off hexes, so a
// status means the same color everywhere: table badges (.badge-* in
// globals.css), dashboard charts (app/dashboard/page.tsx), and the PDF report
// (lib/workOrderReportPdf.tsx, which can't reference CSS custom properties
// since it renders outside the browser). navy #0e5c86 = queued/info, teal
// #0f9488 = active/moving, navy-deep #0a3f5c = underway, amber #d97706 =
// needs action, slate #5b6b7a = neutral/paused/low, green #16a34a = done,
// red #dc2626 = canceled/urgent (kept distinct from brand --accent #c62430).
export const WO_STATUS_COLOR: Record<string, string> = {
  OPEN: "#0e5c86", PENDING_APPROVAL: "#d97706", APPROVED: "#0f9488",
  ASSIGNED: "#0f9488", IN_PROGRESS: "#0a3f5c", PENDING_SIGNOFF: "#d97706",
  ON_HOLD: "#5b6b7a", COMPLETED: "#16a34a", CANCELED: "#dc2626",
};
export const PRIORITY_COLOR: Record<string, string> = { LOW: "#5b6b7a", MEDIUM: "#0e5c86", HIGH: "#d97706", URGENT: "#dc2626" };
