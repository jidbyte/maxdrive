"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, Receipt, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { Panel } from "@/shared/components/admin/panel";
import { ProductPicker, type PickerProduct } from "@/shared/components/admin/product-picker";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import {
  createSaleSchema,
  CREATE_SALE_PAYMENT_STATUSES,
  PAYMENT_METHODS,
  type CreateSaleInput,
} from "@/features/admin/sales/server/schema";
import { createSale } from "@/features/admin/sales/server/actions";

export type ProductOption = PickerProduct;
export type CustomerOption = { id: string; name: string; phone?: string | null };

const selectClass =
  "h-11 w-full rounded-md border border-input bg-surface px-4 text-base text-ink capitalize sm:text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

export function SaleForm({
  products,
  customers,
  currency,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  currency: string;
}) {
  const router = useRouter();
  const [isPending, start] = useActionTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const money = (n: number) => formatPrice(n, currency);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      customerId: "",
      customerName: "Walk-in customer",
      customerPhone: "",
      saleDate: new Date().toISOString().slice(0, 10),
      paymentStatus: "paid",
      paymentMethod: "cash",
      balance: 0,
      discountAmount: 0,
      notes: "",
      items: [],
    },
  });
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const paymentStatus = watch("paymentStatus");
  const discount = Number(watch("discountAmount")) || 0;
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const total = Math.max(0, subtotal - discount);

  function addProduct(p: PickerProduct) {
    const idx = items.findIndex((i) => i.productId === p.id);
    if (idx >= 0) {
      update(idx, { ...items[idx], quantity: (Number(items[idx].quantity) || 0) + 1 });
      return;
    }
    append({ productId: p.id, productName: p.name, productSku: p.sku, productCode: p.code ?? "", quantity: 1, unitPrice: p.sellingPrice });
  }

  function addCustom() {
    append({ productId: "", productName: "", productSku: "CUSTOM", productCode: "", quantity: 1, unitPrice: 0 });
  }

  function pickCustomer(id: string) {
    setValue("customerId", id);
    const c = customers.find((x) => x.id === id);
    setValue("customerName", c ? c.name : "Walk-in customer");
    setValue("customerPhone", c?.phone ?? "");
  }

  const onSubmit = (values: CreateSaleInput) => {
    setServerError(null);
    if (values.items.length === 0) return setServerError("Add at least one item.");
    start(async () => {
      const r = await createSale({ ...values, balance: values.paymentStatus === "paid" ? 0 : Number(values.balance) || total });
      if (!r.success) return setServerError(r.error);
      toast.success("Sale recorded");
      router.push(`/admin/orders/${r.data.id}`);
      router.refresh();
    }, "Recording sale…");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24 lg:pb-0" noValidate>
      <PageHeader>
        <PageTitle icon={Receipt} description="For sales made in the store, by phone or on the road. Stock is deducted immediately.">
          Record a sale
        </PageTitle>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Panel
            title="Items"
            actions={
              <>
                <ProductPicker products={products} currency={currency} onSelect={addProduct} />
                <Button type="button" variant="ghost" onClick={addCustom}><Plus /> Custom item</Button>
              </>
            }
          >
            {fields.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-neutral">
                Add products from your catalog, or a custom line (e.g. labour).
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {fields.map((f, i) => {
                  const custom = !items[i]?.productId;
                  const product = products.find((p) => p.id === items[i]?.productId);
                  const qty = Number(items[i]?.quantity) || 0;
                  const over = product && qty > product.quantity;
                  return (
                    <li key={f.id} className="grid grid-cols-[1fr_auto] gap-3 py-3 sm:grid-cols-[1fr_120px_130px_auto] sm:items-center">
                      <div className="min-w-0">
                        {custom ? (
                          <Input placeholder="Item description" {...register(`items.${i}.productName`)} />
                        ) : (
                          <>
                            <p className="truncate text-sm font-semibold text-ink">{items[i].productName}</p>
                            <p className={cn("font-mono text-xs", over ? "text-danger" : "text-neutral")}>
                              {items[i].productSku} · {product ? `${product.quantity} in stock` : ""}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="row-start-2 flex h-11 items-center rounded-full border border-input px-1 sm:row-start-auto">
                        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Decrease" onClick={() => update(i, { ...items[i], quantity: Math.max(1, qty - 1) })}><Minus /></Button>
                        <input aria-label="Quantity" inputMode="numeric" className="w-full min-w-0 bg-transparent text-center text-sm font-bold text-ink outline-none" {...register(`items.${i}.quantity`, { valueAsNumber: true })} />
                        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Increase" onClick={() => update(i, { ...items[i], quantity: qty + 1 })}><Plus /></Button>
                      </div>
                      <Input aria-label="Unit price" type="number" min={0} wrapperClassName="row-start-2 sm:row-start-auto" {...register(`items.${i}.unitPrice`, { valueAsNumber: true })} />
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => remove(i)} className="row-start-1 justify-self-end sm:row-start-auto">
                        <Trash2 className="text-danger" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {errors.items?.message && <p className="mt-2 text-sm text-danger">{errors.items.message}</p>}
          </Panel>

          <Panel title="Customer">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Existing customer" htmlFor="customerId">
                <select id="customerId" className={selectClass} value={watch("customerId") || ""} onChange={(e) => pickCustomer(e.target.value)}>
                  <option value="">Walk-in / not listed</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Name on receipt" htmlFor="customerName" error={errors.customerName?.message}>
                <Input id="customerName" {...register("customerName")} />
              </FormField>
              <FormField label="Phone" htmlFor="customerPhone">
                <Input id="customerPhone" type="tel" {...register("customerPhone")} />
              </FormField>
              <FormField label="Sale date" htmlFor="saleDate" error={errors.saleDate?.message}>
                <Input id="saleDate" type="date" {...register("saleDate")} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Notes" htmlFor="notes">
                  <Textarea id="notes" rows={2} {...register("notes")} />
                </FormField>
              </div>
            </div>
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Panel title="Payment">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Status" htmlFor="paymentStatus">
                  <select id="paymentStatus" className={selectClass} {...register("paymentStatus")}>
                    {CREATE_SALE_PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Method" htmlFor="paymentMethod">
                  <select id="paymentMethod" className={selectClass} {...register("paymentMethod")}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                  </select>
                </FormField>
              </div>
              {paymentStatus !== "paid" && (
                <FormField label="Balance due" htmlFor="balance">
                  <Input id="balance" type="number" min={0} {...register("balance", { valueAsNumber: true })} />
                </FormField>
              )}
              <FormField label="Discount" htmlFor="discountAmount">
                <Input id="discountAmount" type="number" min={0} {...register("discountAmount", { valueAsNumber: true })} />
              </FormField>
              <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-neutral">Subtotal</dt><dd className="tabular-nums">{money(subtotal)}</dd></div>
                {discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd className="tabular-nums">−{money(discount)}</dd></div>}
                <div className="flex justify-between pt-1 text-lg font-extrabold text-ink"><dt>Total</dt><dd className="tabular-nums">{money(total)}</dd></div>
              </dl>
              {serverError && <Message variant="error">{serverError}</Message>}
              <Button type="submit" size="lg" className="hidden w-full lg:inline-flex" loading={isPending}>Record sale</Button>
            </div>
          </Panel>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-surface/90 p-3 backdrop-blur-xl lg:hidden">
        <Button asChild variant="outline"><Link href="/admin/orders">Cancel</Link></Button>
        <Button type="submit" className="flex-1" loading={isPending}>Record · {money(total)}</Button>
      </div>
    </form>
  );
}
