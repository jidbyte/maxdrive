"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { Panel } from "@/shared/components/admin/panel";
import { ProductPicker, type PickerProduct } from "@/shared/components/admin/product-picker";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { formatPrice } from "@/shared/utils/currency";
import { createPurchaseSchema, type CreatePurchaseInput } from "@/features/admin/purchases/server/schema";
import { createPurchase, updatePurchase } from "@/features/admin/purchases/server/actions";

export type SupplierOption = { id: string; companyName: string };

const selectClass =
  "h-11 w-full rounded-md border border-input bg-surface px-4 text-base text-ink sm:text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

export function PurchaseForm({
  purchaseId,
  products,
  suppliers,
  currency,
  defaultValues,
}: {
  purchaseId?: string;
  products: PickerProduct[];
  suppliers: SupplierOption[];
  currency: string;
  defaultValues?: CreatePurchaseInput;
}) {
  const router = useRouter();
  const [isPending, start] = useActionTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const money = (n: number) => formatPrice(n, currency);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: defaultValues ?? {
      supplierId: "",
      supplierName: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      eta: "",
      shippingCost: 0,
      discountAmount: 0,
      items: [],
    },
  });
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const shipping = Number(watch("shippingCost")) || 0;
  const discount = Number(watch("discountAmount")) || 0;
  const itemsTotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);
  const total = Math.max(0, itemsTotal + shipping - discount);

  function addProduct(p: PickerProduct) {
    const idx = items.findIndex((i) => i.productId === p.id);
    if (idx >= 0) return update(idx, { ...items[idx], quantity: (Number(items[idx].quantity) || 0) + 1 });
    append({ productId: p.id, productName: p.name, productSku: p.sku, productCode: p.code ?? "", quantity: 1, unitCost: p.costPrice });
  }

  const onSubmit = (values: CreatePurchaseInput) => {
    setServerError(null);
    if (values.items.length === 0) return setServerError("Add at least one item.");
    start(async () => {
      const r = purchaseId ? await updatePurchase(purchaseId, values) : await createPurchase(values);
      if (!r.success) return setServerError(r.error);
      toast.success(purchaseId ? "Purchase order updated" : "Purchase order created");
      const id = purchaseId ?? (r.data as { id: string }).id;
      router.push(`/admin/purchases/${id}`);
      router.refresh();
    }, "Saving…");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 pb-24 lg:grid-cols-[1fr_340px] lg:pb-0" noValidate>
      <div className="min-w-0 space-y-6">
        <Panel title="Supplier">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Supplier" htmlFor="supplierId">
              <select
                id="supplierId"
                className={selectClass}
                value={watch("supplierId") || ""}
                onChange={(e) => {
                  setValue("supplierId", e.target.value);
                  const s = suppliers.find((x) => x.id === e.target.value);
                  if (s) setValue("supplierName", s.companyName, { shouldValidate: true });
                }}
              >
                <option value="">Not in supplier list</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
              </select>
            </FormField>
            <FormField label="Supplier name" htmlFor="supplierName" required error={errors.supplierName?.message}>
              <Input id="supplierName" {...register("supplierName")} />
            </FormField>
            <FormField label="Order date" htmlFor="purchaseDate" error={errors.purchaseDate?.message}>
              <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
            </FormField>
            <FormField label="Expected arrival" htmlFor="eta">
              <Input id="eta" type="date" {...register("eta")} />
            </FormField>
          </div>
          {suppliers.length === 0 && (
            <p className="mt-3 text-xs text-neutral">
              Tip: <Link href="/admin/suppliers/new" className="font-semibold text-primary">add suppliers</Link> to reuse their details.
            </p>
          )}
        </Panel>

        <Panel title="Items" actions={<ProductPicker products={products} currency={currency} onSelect={addProduct} priceField="costPrice" />}>
          {fields.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-neutral">
              Add the products you&apos;re ordering. Unit cost defaults to the product&apos;s current cost price.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {fields.map((f, i) => {
                const qty = Number(items[i]?.quantity) || 0;
                return (
                  <li key={f.id} className="grid grid-cols-[1fr_auto] gap-3 py-3 sm:grid-cols-[1fr_120px_130px_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{items[i]?.productName}</p>
                      <p className="font-mono text-xs text-neutral">{items[i]?.productSku}</p>
                    </div>
                    <div className="row-start-2 flex h-11 items-center rounded-full border border-input px-1 sm:row-start-auto">
                      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Decrease" onClick={() => update(i, { ...items[i], quantity: Math.max(1, qty - 1) })}><Minus /></Button>
                      <input aria-label="Quantity" inputMode="numeric" className="w-full min-w-0 bg-transparent text-center text-sm font-bold text-ink outline-none" {...register(`items.${i}.quantity`, { valueAsNumber: true })} />
                      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Increase" onClick={() => update(i, { ...items[i], quantity: qty + 1 })}><Plus /></Button>
                    </div>
                    <Input aria-label="Unit cost" type="number" min={0} wrapperClassName="row-start-2 sm:row-start-auto" {...register(`items.${i}.unitCost`, { valueAsNumber: true })} />
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => remove(i)} className="row-start-1 justify-self-end sm:row-start-auto">
                      <Trash2 className="text-danger" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Panel title="Summary">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Shipping" htmlFor="shippingCost">
                <Input id="shippingCost" type="number" min={0} {...register("shippingCost", { valueAsNumber: true })} />
              </FormField>
              <FormField label="Discount" htmlFor="discountAmount">
                <Input id="discountAmount" type="number" min={0} {...register("discountAmount", { valueAsNumber: true })} />
              </FormField>
            </div>
            <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-neutral">Items</dt><dd className="tabular-nums">{money(itemsTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral">Shipping</dt><dd className="tabular-nums">{money(shipping)}</dd></div>
              {discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd className="tabular-nums">−{money(discount)}</dd></div>}
              <div className="flex justify-between pt-1 text-lg font-extrabold text-ink"><dt>Total</dt><dd className="tabular-nums">{money(total)}</dd></div>
            </dl>
            <p className="text-xs text-neutral">Saved as a draft. Stock is added when you mark it received.</p>
            {serverError && <Message variant="error">{serverError}</Message>}
            <Button type="submit" size="lg" className="hidden w-full lg:inline-flex" loading={isPending}>
              {purchaseId ? "Save changes" : "Create purchase order"}
            </Button>
          </div>
        </Panel>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-surface/90 p-3 backdrop-blur-xl lg:hidden">
        <Button asChild variant="outline"><Link href="/admin/purchases">Cancel</Link></Button>
        <Button type="submit" className="flex-1" loading={isPending}>Save · {money(total)}</Button>
      </div>
    </form>
  );
}
