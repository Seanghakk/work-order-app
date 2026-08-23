export function canAccessSaleOrders(role?: string | null): boolean {
  return ["SALES", "ENGINEERING", "AA", "MANAGER", "ADMIN"].includes(role || "");
}