CREATE INDEX "WorkOrder_siteId_archived_idx" ON "WorkOrder"("siteId", "archived");
CREATE INDEX "WorkOrder_teamId_idx" ON "WorkOrder"("teamId");
CREATE INDEX "WorkOrder_assignedToId_idx" ON "WorkOrder"("assignedToId");
CREATE INDEX "WorkOrder_requestedById_idx" ON "WorkOrder"("requestedById");