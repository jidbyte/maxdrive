"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, CheckCircle2, FileText, PackageCheck, PlayCircle, Truck } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/common/form-field";
import { cancelSale, updateSalePaymentInfo, updateSaleStatus } from "@/features/admin/sales/server/actions";
import { CREATE_SALE_PAYMENT_STATUSES, type PaymentStatus, type SaleStatus } from "@/features/admin/sales/server/schema";
import { createInvoiceFromSale } from "@/features/admin/invoices/server/actions";

type Step = { to: SaleStatus; label: string; icon: typeof CheckCircle2 };

function nextSteps(status: SaleStatus, fulfilment: string): Step[] {
  switch (status) {
    case "pending":
      return [{ to: "processing", label: "Start processing", icon: PlayCircle }];
    case "processing":
      return fulfilment === "delivery"
        ? [{ to: "shipped", label: "Mark shipped", icon: Truck }]
        : [{ to: "ready", label: "Ready for pickup", icon: PackageCheck }];
    case "ready":
    case "shipped":
      return [{ to: "completed", label: fulfilment === "delivery" ? "Mark delivered" : "Mark collected", icon: CheckCircle2 }];
    default:
      return [];
  }
}

export function FulfilmentActions({ saleId, status, fulfilment }: { saleId: string; status: SaleStatus; fulfilment: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const steps = nextSteps(status, fulfilment);
  const closed = status === "cancelled" || status === "refunded" || status === "completed";

  function run(fn: () => Promise<{ success: boolean; error?: string }>, msg: string) {
    start(async () => {
      const r = await fn();
      if (!r.success) toast.error(r.error ?? "Failed");
      else toast.success(msg);
      router.refresh();
    });
  }

  if (closed) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((s) => (
        <Button key={s.to} disabled={pending} onClick={() => run(() => updateSaleStatus(saleId, s.to), "Order updated")}>
          <s.icon /> {s.label}
        </Button>
      ))}
      <Button
        variant="ghost"
        className="text-danger hover:text-danger"
        disabled={pending}
        onClick={() => {
          if (confirm("Cancel this order? Any reserved or sold stock goes back to inventory.")) {
            run(() => cancelSale(saleId), "Order cancelled");
          }
        }}
      >
        <Ban /> Cancel order
      </Button>
    </div>
  );
}

export function PaymentEditor({
  saleId,
  paymentStatus,
  balance,
}: {
  saleId: string;
  paymentStatus: PaymentStatus;
  balance: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof CREATE_SALE_PAYMENT_STATUSES)[number]>(
    (CREATE_SALE_PAYMENT_STATUSES as readonly string[]).includes(paymentStatus) ? (paymentStatus as (typeof CREATE_SALE_PAYMENT_STATUSES)[number]) : "pending",
  );
  const [bal, setBal] = useState(String(balance));
  const [pending, start] = useTransition();
  if (paymentStatus === "cancelled" || paymentStatus === "refunded") return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <FormField label="Payment status" htmlFor="pay-status">
        <select
          id="pay-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="h-11 w-full rounded-md border border-input bg-surface px-4 text-sm capitalize text-ink sm:w-44"
        >
          {CREATE_SALE_PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FormField>
      {status !== "paid" && (
        <FormField label="Balance due" htmlFor="pay-balance">
          <Input id="pay-balance" type="number" min={0} value={bal} onChange={(e) => setBal(e.target.value)} wrapperClassName="sm:w-36" />
        </FormField>
      )}
      <Button
        variant="outline"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await updateSalePaymentInfo(saleId, status, Number(bal) || 0);
            if (!r.success) toast.error(r.error);
            else toast.success("Payment updated");
            router.refresh();
          })
        }
      >
        Save payment
      </Button>
    </div>
  );
}

export function CreateInvoiceButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await createInvoiceFromSale({ saleId, dueDate: "", notes: "" });
          if (!r.success) toast.error(r.error);
          else {
            toast.success("Invoice created");
            router.push("/admin/finance/invoices");
          }
        })
      }
    >
      {!pending && <FileText />} Create invoice
    </Button>
  );
}
