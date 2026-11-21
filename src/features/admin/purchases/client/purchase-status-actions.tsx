"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, PackageCheck, Send, Truck } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { updatePurchasePaymentStatus, updatePurchaseStatus } from "@/features/admin/purchases/server/actions";
import { PAYMENT_STATUSES, type PaymentStatus, type PurchaseStatus } from "@/features/admin/purchases/server/schema";

export function PurchaseStatusActions({
  purchaseId,
  purchaseStatus,
  paymentStatus,
}: {
  purchaseId: string;
  purchaseStatus: PurchaseStatus;
  paymentStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const closed = purchaseStatus === "received" || purchaseStatus === "cancelled";

  function run(fn: () => Promise<{ success: boolean; error?: string }>, msg: string) {
    start(async () => {
      const r = await fn();
      if (!r.success) toast.error(r.error ?? "Failed");
      else toast.success(msg);
      router.refresh();
    });
  }

  const next: Array<{ to: PurchaseStatus; label: string; icon: typeof Send; confirm?: string }> =
    purchaseStatus === "draft"
      ? [{ to: "ordered", label: "Mark as ordered", icon: Send }]
      : purchaseStatus === "ordered"
        ? [
            { to: "shipped", label: "Mark in transit", icon: Truck },
            { to: "received", label: "Receive stock", icon: PackageCheck, confirm: "Receive this order? Every line will be added to stock." },
          ]
        : purchaseStatus === "shipped"
          ? [{ to: "received", label: "Receive stock", icon: PackageCheck, confirm: "Receive this order? Every line will be added to stock." }]
          : [];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      {!closed ? (
        <div className="flex flex-wrap gap-2">
          {next.map((n) => (
            <Button
              key={n.to}
              disabled={pending}
              onClick={() => {
                if (n.confirm && !confirm(n.confirm)) return;
                run(() => updatePurchaseStatus(purchaseId, n.to), n.to === "received" ? "Stock received" : "Purchase updated");
              }}
            >
              <n.icon /> {n.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="text-danger hover:text-danger"
            disabled={pending}
            onClick={() => confirm("Cancel this purchase order?") && run(() => updatePurchaseStatus(purchaseId, "cancelled"), "Purchase cancelled")}
          >
            <Ban /> Cancel
          </Button>
        </div>
      ) : (
        <p className="text-sm text-neutral">This order is {purchaseStatus}.</p>
      )}
      {purchaseStatus !== "cancelled" && (
        <label className="flex items-center gap-2 text-sm text-neutral">
          Payment
          <select
            value={paymentStatus}
            disabled={pending}
            onChange={(e) => run(() => updatePurchasePaymentStatus(purchaseId, e.target.value as PaymentStatus), "Payment updated")}
            className="h-10 rounded-full border border-input bg-surface px-3.5 text-sm capitalize text-ink"
          >
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
