"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { cn } from "@/shared/lib/utils";
import { adjustStock, deleteProduct } from "@/features/admin/products/server/actions";
import type { AdjustStockInput } from "@/features/admin/products/server/schema";

const REASONS: Array<{ value: AdjustStockInput["reason"]; label: string; direction: "in" | "out" | "both" }> = [
  { value: "adjustment", label: "Manual adjustment", direction: "both" },
  { value: "stock_take", label: "Stock-take correction", direction: "both" },
  { value: "damaged", label: "Damaged / written off", direction: "out" },
  { value: "returned", label: "Customer return", direction: "in" },
];

export function AdjustStockDialog({
  productId,
  productName,
  currentQuantity,
  trigger = "button",
}: {
  productId: string;
  productName?: string;
  currentQuantity: number;
  trigger?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState<AdjustStockInput["reason"]>("adjustment");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useActionTransition();

  const qty = Math.max(0, Math.floor(Number(amount) || 0));
  const projected = direction === "in" ? currentQuantity + qty : currentQuantity - qty;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDirection("in");
      setAmount("1");
      setReason("adjustment");
      setNote("");
      setError(null);
    }
  }

  function pickReason(r: AdjustStockInput["reason"]) {
    setReason(r);
    const d = REASONS.find((x) => x.value === r)?.direction;
    if (d === "in" || d === "out") setDirection(d);
  }

  function submit() {
    setError(null);
    if (qty <= 0) return setError("Enter a quantity greater than zero.");
    if (projected < 0) return setError("Stock can't go below zero.");
    start(async () => {
      const r = await adjustStock({ productId, delta: direction === "in" ? qty : -qty, reason, note: note.trim() });
      if (!r.success) return setError(r.error);
      toast.success(`Stock updated to ${projected}`);
      onOpenChange(false);
      router.refresh();
    }, "Updating stock…");
  }

  const allowed = REASONS.find((x) => x.value === reason)?.direction ?? "both";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger === "icon" ? (
          <Button variant="ghost" size="icon" aria-label={`Adjust stock${productName ? ` for ${productName}` : ""}`}>
            <SlidersHorizontal />
          </Button>
        ) : (
          <Button variant="outline">
            <SlidersHorizontal /> Adjust stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {productName ? `${productName} · ` : ""}currently <b className="text-ink">{currentQuantity}</b> in stock. Every change is
            logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Reason" htmlFor="reason">
            <select
              id="reason"
              value={reason}
              onChange={(e) => pickReason(e.target.value as AdjustStockInput["reason"])}
              className="h-11 w-full rounded-md border border-input bg-surface px-4 text-sm text-ink"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            {(["in", "out"] as const).map((d) => (
              <button
                key={d}
                type="button"
                disabled={allowed !== "both" && allowed !== d}
                onClick={() => setDirection(d)}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors disabled:opacity-40",
                  direction === d ? "border-primary bg-primary-soft text-primary" : "border-border text-neutral",
                )}
              >
                {d === "in" ? <Plus className="size-4" /> : <Minus className="size-4" />}
                {d === "in" ? "Add stock" : "Remove stock"}
              </button>
            ))}
          </div>

          <FormField label="Quantity" htmlFor="qty">
            <Input id="qty" type="number" min={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label="Note (optional)" htmlFor="note">
            <Input id="note" placeholder="e.g. Counted 14 on shelf B3" value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>

          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-neutral">
            New stock level:{" "}
            <b className={cn("text-lg tabular-nums", projected < 0 ? "text-danger" : "text-ink")}>{projected}</b>
          </p>
          {error && <Message variant="error">{error}</Message>}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} loading={isPending}>
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteProductDialog({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useActionTransition();

  function submit() {
    setError(null);
    start(async () => {
      const r = await deleteProduct(productId);
      if (!r.success) return setError(r.error);
      setOpen(false);
      toast.success("Product deleted");
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-danger hover:text-danger">
          <Trash2 /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete this product?</DialogTitle>
          <DialogDescription>
            It will be removed from the catalog and storefront. Past orders keep their history.
          </DialogDescription>
        </DialogHeader>
        {error && <Message variant="error">{error}</Message>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={submit} loading={isPending}>
            Delete product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
