-- Drops Notification.saleOrderId, a dead column left over from an old, incomplete
-- feature attempt (added in 20260824022213_notification_sale_order with no FK and
-- never wired up anywhere in the app). Confirmed via direct query: 0 of the live
-- Notification rows have this column set, and no code anywhere reads or writes it.
ALTER TABLE "Notification" DROP COLUMN "saleOrderId";
