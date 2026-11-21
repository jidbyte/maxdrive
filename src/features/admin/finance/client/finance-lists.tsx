"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, CheckCircle2, Copy, FileDown, Mail, MessageCircle, MoreHorizontal, SquarePen, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { DataList } from "@/shared/components/admin/data-list";
import { StatusBadge } from "@/shared/components/admin/status-badge";
import { formatPrice } from "@/shared/utils/currency";
import { ExpenseFormDialog } from "@/features/admin/expenses/client/expense-form-dialog";
import { IncomeFormDialog } from "@/features/admin/income/client/income-form-dialog";
import { CouponFormDialog } from "@/features/admin/coupons/client/coupon-form-dialog";
import { deleteExpense } from "@/features/admin/expenses/server/actions";
import { deleteIncome } from "@/features/admin/income/server/actions";
import { deleteCoupon } from "@/features/admin/coupons/server/actions";
import {
  generateInvoicePdf,
  markInvoicePaid,
  sendInvoiceByEmail,
  sendInvoiceByWhatsapp,
  voidInvoice,
} from "@/features/admin/invoices/server/actions";
import type { EXPENSE_CATEGORIES } from "@/features/admin/expenses/server/schema";

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return {
    pending,
    run(fn: () => Promise<{ success: boolean; error?: string }>, msg: string, confirmText?: string) {
      if (confirmText && !confirm(confirmText)) return;
      start(async () => {
        const r = await fn();
        if (!r.success) toast.error(r.error ?? "Something went wrong");
        else toast.success(msg);
        router.refresh();
      });
    },
  };
}

function EditButton() {
  return (
    <Button variant="ghost" size="icon" aria-label="Edit">
      <SquarePen />
    </Button>
  );
}

// ─── Expenses ─────────────────────────────────────────────────────────────
export type ExpenseRow = { id: string; category: (typeof EXPENSE_CATEGORIES)[number]; description: string; amount: number; expenseDate: string };

export function ExpensesList({ rows, currency }: { rows: ExpenseRow[]; currency: string }) {
  const { run, pending } = useRun();
  const money = (n: number) => formatPrice(n, currency);
  return (
    <DataList
      rows={rows}
      getRowId={(r) => r.id}
      searchText={(r) => `${r.description} ${r.category}`}
      searchPlaceholder="Search expenses"
      defaultSort={{ key: "date", dir: "desc" }}
      filters={(["rent", "salaries", "bills", "tax", "marketing", "other"] as const).map((c) => ({
        key: c,
        label: c[0].toUpperCase() + c.slice(1),
        predicate: (r: ExpenseRow) => r.category === c,
      }))}
      columns={[
        { key: "description", header: "Description", cell: (r) => <span className="font-medium text-ink">{r.description}</span> },
        { key: "category", header: "Category", cell: (r) => <Badge variant="secondary" className="capitalize">{r.category}</Badge> },
        { key: "date", header: "Date", cell: (r) => <span className="text-neutral">{day(r.expenseDate)}</span>, sortValue: (r) => r.expenseDate },
        { key: "amount", header: "Amount", align: "right", cell: (r) => <span className="font-bold text-ink tabular-nums">{money(r.amount)}</span>, sortValue: (r) => r.amount },
      ]}
      rowActions={(r) => (
        <span className="flex">
          <ExpenseFormDialog
            expenseId={r.id}
            trigger={<EditButton />}
            defaultValues={{ category: r.category, description: r.description, amount: r.amount, expenseDate: r.expenseDate.slice(0, 10) }}
          />
          <Button variant="ghost" size="icon" aria-label="Delete" disabled={pending} onClick={() => run(() => deleteExpense(r.id), "Expense deleted", "Delete this expense?")}>
            <Trash2 className="text-danger" />
          </Button>
        </span>
      )}
      mobile={(r) => ({ title: r.description, subtitle: `${r.category} · ${day(r.expenseDate)}`, value: money(r.amount) })}
      empty={{ title: "No expenses recorded", description: "Track rent, salaries, bills and other running costs here." }}
    />
  );
}

// ─── Income ───────────────────────────────────────────────────────────────
export type IncomeRow = { id: string; source: string; description: string | null; amount: number; incomeDate: string };

export function IncomeList({ rows, currency }: { rows: IncomeRow[]; currency: string }) {
  const { run, pending } = useRun();
  const money = (n: number) => formatPrice(n, currency);
  return (
    <DataList
      rows={rows}
      getRowId={(r) => r.id}
      searchText={(r) => `${r.source} ${r.description ?? ""}`}
      searchPlaceholder="Search income"
      defaultSort={{ key: "date", dir: "desc" }}
      columns={[
        {
          key: "source",
          header: "Source",
          cell: (r) => (
            <span>
              <span className="block font-medium text-ink">{r.source}</span>
              {r.description && <span className="text-xs text-neutral">{r.description}</span>}
            </span>
          ),
        },
        { key: "date", header: "Date", cell: (r) => <span className="text-neutral">{day(r.incomeDate)}</span>, sortValue: (r) => r.incomeDate },
        { key: "amount", header: "Amount", align: "right", cell: (r) => <span className="font-bold text-success tabular-nums">{money(r.amount)}</span>, sortValue: (r) => r.amount },
      ]}
      rowActions={(r) => (
        <span className="flex">
          <IncomeFormDialog
            incomeId={r.id}
            trigger={<EditButton />}
            defaultValues={{ source: r.source, description: r.description ?? "", amount: r.amount, incomeDate: r.incomeDate.slice(0, 10) }}
          />
          <Button variant="ghost" size="icon" aria-label="Delete" disabled={pending} onClick={() => run(() => deleteIncome(r.id), "Income deleted", "Delete this income entry?")}>
            <Trash2 className="text-danger" />
          </Button>
        </span>
      )}
      mobile={(r) => ({ title: r.source, subtitle: `${day(r.incomeDate)}${r.description ? ` · ${r.description}` : ""}`, value: money(r.amount) })}
      empty={{ title: "No other income yet", description: "Income that isn't a sale — e.g. fees, refunds received, commissions." }}
    />
  );
}

// ─── Coupons ──────────────────────────────────────────────────────────────
export type CouponRow = {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

function couponState(r: CouponRow): { label: string; variant: "success" | "secondary" | "warning" | "destructive" } {
  const now = Date.now();
  if (!r.isActive) return { label: "Paused", variant: "secondary" };
  if (r.expiresAt && new Date(r.expiresAt).getTime() < now) return { label: "Expired", variant: "destructive" };
  if (r.startsAt && new Date(r.startsAt).getTime() > now) return { label: "Scheduled", variant: "warning" };
  if (r.maxRedemptions !== null && r.redemptionCount >= r.maxRedemptions) return { label: "Used up", variant: "destructive" };
  return { label: "Active", variant: "success" };
}

export function CouponsList({ rows, currency, canManage }: { rows: CouponRow[]; currency: string; canManage: boolean }) {
  const { run, pending } = useRun();
  const money = (n: number) => formatPrice(n, currency);
  const value = (r: CouponRow) => (r.discountType === "percentage" ? `${r.discountValue}% off` : `${money(r.discountValue)} off`);
  return (
    <DataList
      rows={rows}
      getRowId={(r) => r.id}
      searchText={(r) => r.code}
      searchPlaceholder="Search codes"
      filters={[
        { key: "active", label: "Active", predicate: (r) => couponState(r).label === "Active" },
        { key: "inactive", label: "Inactive", predicate: (r) => couponState(r).label !== "Active" },
      ]}
      columns={[
        { key: "code", header: "Code", cell: (r) => <span className="font-mono font-bold text-ink">{r.code}</span>, sortValue: (r) => r.code },
        {
          key: "value",
          header: "Discount",
          cell: (r) => (
            <span>
              <span className="block text-ink">{value(r)}</span>
              {r.minOrderAmount > 0 && <span className="text-xs text-neutral">min. {money(r.minOrderAmount)}</span>}
            </span>
          ),
        },
        { key: "uses", header: "Used", cell: (r) => <span className="tabular-nums">{r.redemptionCount}{r.maxRedemptions !== null ? ` / ${r.maxRedemptions}` : ""}</span>, sortValue: (r) => r.redemptionCount },
        { key: "window", header: "Valid", cell: (r) => <span className="text-xs text-neutral">{r.startsAt ? day(r.startsAt) : "Now"} → {r.expiresAt ? day(r.expiresAt) : "No end"}</span> },
        { key: "state", header: "Status", cell: (r) => { const s = couponState(r); return <Badge variant={s.variant}>{s.label}</Badge>; } },
      ]}
      rowActions={(r) => (
        <span className="flex">
          <Button variant="ghost" size="icon" aria-label="Copy code" onClick={() => navigator.clipboard.writeText(r.code).then(() => toast.success("Copied"))}>
            <Copy />
          </Button>
          {canManage && (
            <>
              <CouponFormDialog
                couponId={r.id}
                trigger={<EditButton />}
                defaultValues={{
                  code: r.code,
                  discountType: r.discountType,
                  discountValue: r.discountValue,
                  minOrderAmount: r.minOrderAmount,
                  maxRedemptions: r.maxRedemptions,
                  startsAt: r.startsAt?.slice(0, 10) ?? "",
                  expiresAt: r.expiresAt?.slice(0, 10) ?? "",
                  isActive: r.isActive,
                }}
              />
              <Button variant="ghost" size="icon" aria-label="Delete" disabled={pending} onClick={() => run(() => deleteCoupon(r.id), "Coupon deleted", `Delete coupon ${r.code}?`)}>
                <Trash2 className="text-danger" />
              </Button>
            </>
          )}
        </span>
      )}
      mobile={(r) => {
        const s = couponState(r);
        return { title: <span className="font-mono">{r.code}</span>, subtitle: `${value(r)} · used ${r.redemptionCount}`, badge: <Badge variant={s.variant}>{s.label}</Badge> };
      }}
      empty={{ title: "No coupons yet", description: "Create discount codes customers can enter at checkout." }}
    />
  );
}

// ─── Invoices ─────────────────────────────────────────────────────────────
export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  issueDate: string;
  dueDate: string | null;
  pdfUrl: string | null;
  saleId: string | null;
};

function InvoiceActions({ r, canManage }: { r: InvoiceRow; canManage: boolean }) {
  const { run, pending } = useRun();
  const closed = r.status === "void";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${r.invoiceNumber}`} disabled={pending}>
          <MoreHorizontal />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        {r.pdfUrl ? (
          <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2">
            <FileDown className="size-4 text-neutral" /> Open PDF
          </a>
        ) : (
          canManage && (
            <button onClick={() => run(() => generateInvoicePdf(r.id), "PDF generated")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2">
              <FileDown className="size-4 text-neutral" /> Generate PDF
            </button>
          )
        )}
        {canManage && !closed && (
          <>
            <button disabled={!r.customerEmail} onClick={() => run(() => sendInvoiceByEmail(r.id), "Invoice emailed")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2 disabled:opacity-40">
              <Mail className="size-4 text-neutral" /> Send by email
            </button>
            <button disabled={!r.customerPhone} onClick={() => run(() => sendInvoiceByWhatsapp(r.id), "Sent on WhatsApp")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2 disabled:opacity-40">
              <MessageCircle className="size-4 text-neutral" /> Send on WhatsApp
            </button>
            {r.status !== "paid" && (
              <button onClick={() => run(() => markInvoicePaid(r.id), "Marked paid")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2">
                <CheckCircle2 className="size-4 text-success" /> Mark paid
              </button>
            )}
            <button onClick={() => run(() => voidInvoice(r.id), "Invoice voided", `Void ${r.invoiceNumber}?`)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger hover:bg-surface-2">
              <Ban className="size-4" /> Void
            </button>
          </>
        )}
        {r.saleId && (
          <a href={`/admin/orders/${r.saleId}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-surface-2">
            View order →
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function InvoicesList({ rows, currency, canManage }: { rows: InvoiceRow[]; currency: string; canManage: boolean }) {
  const money = (n: number) => formatPrice(n, currency);
  return (
    <DataList
      rows={rows}
      getRowId={(r) => r.id}
      searchText={(r) => `${r.invoiceNumber} ${r.customerName}`}
      searchPlaceholder="Search invoice # or customer"
      defaultSort={{ key: "date", dir: "desc" }}
      filters={[
        { key: "open", label: "Unpaid", predicate: (r) => r.status === "draft" || r.status === "sent" || r.status === "overdue" },
        { key: "paid", label: "Paid", predicate: (r) => r.status === "paid" },
        { key: "void", label: "Void", predicate: (r) => r.status === "void" },
      ]}
      columns={[
        { key: "number", header: "Invoice", cell: (r) => <span className="font-mono font-semibold text-ink">{r.invoiceNumber}</span>, sortValue: (r) => r.invoiceNumber },
        { key: "customer", header: "Customer", cell: (r) => r.customerName, sortValue: (r) => r.customerName.toLowerCase() },
        { key: "date", header: "Issued", cell: (r) => <span className="text-neutral">{day(r.issueDate)}</span>, sortValue: (r) => r.issueDate },
        { key: "due", header: "Due", cell: (r) => <span className="text-neutral">{r.dueDate ? day(r.dueDate) : "—"}</span> },
        { key: "status", header: "Status", cell: (r) => <StatusBadge kind="invoice" value={r.status} /> },
        { key: "total", header: "Total", align: "right", cell: (r) => <span className="font-bold text-ink tabular-nums">{money(r.totalAmount)}</span>, sortValue: (r) => r.totalAmount },
      ]}
      rowActions={(r) => <InvoiceActions r={r} canManage={canManage} />}
      mobile={(r) => ({
        title: <span><span className="font-mono">{r.invoiceNumber}</span> · {r.customerName}</span>,
        subtitle: day(r.issueDate),
        value: money(r.totalAmount),
        badge: <StatusBadge kind="invoice" value={r.status} />,
      })}
      empty={{ title: "No invoices yet", description: "Create one from any order — on the order page or with “New invoice”." }}
    />
  );
}
