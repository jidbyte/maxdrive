import { Badge } from "@/shared/components/ui/badge";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const MAPS: Record<string, Record<string, { label: string; variant: Variant }>> = {
  payment: {
    pending: { label: "Unpaid", variant: "warning" },
    partial: { label: "Part-paid", variant: "warning" },
    paid: { label: "Paid", variant: "success" },
    overdue: { label: "Overdue", variant: "destructive" },
    cancelled: { label: "Cancelled", variant: "secondary" },
    refunded: { label: "Refunded", variant: "secondary" },
  },
  order: {
    pending: { label: "Pending", variant: "warning" },
    processing: { label: "To fulfil", variant: "default" },
    ready: { label: "Ready", variant: "default" },
    shipped: { label: "Shipped", variant: "default" },
    completed: { label: "Completed", variant: "success" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    refunded: { label: "Refunded", variant: "secondary" },
  },
  purchase: {
    draft: { label: "Draft", variant: "secondary" },
    ordered: { label: "Ordered", variant: "default" },
    shipped: { label: "In transit", variant: "default" },
    received: { label: "Received", variant: "success" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  },
  invoice: {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    paid: { label: "Paid", variant: "success" },
    overdue: { label: "Overdue", variant: "destructive" },
    void: { label: "Void", variant: "outline" },
  },
  channel: {
    online: { label: "Online", variant: "default" },
    walk_in: { label: "Walk-in", variant: "secondary" },
    workshop: { label: "Workshop", variant: "secondary" },
  },
};

export function StatusBadge({ kind, value }: { kind: keyof typeof MAPS; value: string }) {
  const m = MAPS[kind][value] ?? { label: value.replace(/_/g, " "), variant: "outline" as Variant };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
