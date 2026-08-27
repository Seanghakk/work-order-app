// A WorkOrder only becomes an authorized order once "approve" actually fires —
// approvedById is set exactly once, at that moment (see ACTION_TRANSITIONS in
// app/api/work-orders/[id]/route.ts), and never unset afterward. Before that,
// regardless of its current status (PENDING_APPROVAL, a rejected/reopened OPEN,
// or even ON_HOLD/CANCELED if either happened pre-approval), it's still just a
// request. approvedById is the single source of truth for this distinction —
// status is a separate axis (lifecycle state) and is deliberately not consulted.
export function isRequestPhase(wo: { approvedById: string | null }): boolean {
  return !wo.approvedById;
}

export function workOrderTypeLabel(wo: { approvedById: string | null }): string {
  return isRequestPhase(wo) ? "Work Order Request" : "Work Order";
}
