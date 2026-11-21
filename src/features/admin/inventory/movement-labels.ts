import type { StockReason } from "./server/stock";

export const MOVEMENT_LABEL: Record<StockReason, string> = {
  sale: "Sale",
  sale_cancelled: "Sale cancelled",
  purchase_received: "Purchase received",
  adjustment: "Manual adjustment",
  stock_take: "Stock-take",
  damaged: "Damaged",
  returned: "Customer return",
  work_order: "Work order",
  initial: "Opening stock",
};
