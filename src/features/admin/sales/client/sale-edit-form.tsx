"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { updateSaleSchema, type UpdateSaleInput } from "@/features/admin/sales/server/schema";
import { updateSale } from "@/features/admin/sales/server/actions";
import type { CustomerOption } from "./sale-form";

const selectClass = "h-11 w-full rounded-md border border-input bg-surface px-4 text-sm text-ink";

export function SaleEditForm({
  saleId,
  customers,
  defaultValues,
}: {
  saleId: string;
  customers: CustomerOption[];
  defaultValues: UpdateSaleInput;
}) {
  const router = useRouter();
  const [isPending, start] = useActionTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<UpdateSaleInput>({
    resolver: zodResolver(updateSaleSchema),
    defaultValues,
  });

  const onSubmit = (values: UpdateSaleInput) => {
    setServerError(null);
    start(async () => {
      const r = await updateSale(saleId, values);
      if (!r.success) return setServerError(r.error);
      toast.success("Order updated");
      router.push(`/admin/orders/${saleId}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Customer record" htmlFor="customerId">
          <select
            id="customerId"
            className={selectClass}
            value={watch("customerId") || ""}
            onChange={(e) => {
              setValue("customerId", e.target.value);
              const c = customers.find((x) => x.id === e.target.value);
              if (c) setValue("customerName", c.name);
            }}
          >
            <option value="">Walk-in / not listed</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Customer name" htmlFor="customerName" error={errors.customerName?.message}>
          <Input id="customerName" {...register("customerName")} />
        </FormField>
        <FormField label="Sale date" htmlFor="saleDate" error={errors.saleDate?.message}>
          <Input id="saleDate" type="date" {...register("saleDate")} />
        </FormField>
        <FormField label="Discount" htmlFor="discountAmount">
          <Input id="discountAmount" type="number" min={0} {...register("discountAmount", { valueAsNumber: true })} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" rows={3} {...register("notes")} />
          </FormField>
        </div>
      </div>
      {serverError && <Message variant="error">{serverError}</Message>}
      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button asChild variant="outline"><Link href={`/admin/orders/${saleId}`}>Cancel</Link></Button>
        <Button type="submit" loading={isPending}>Save changes</Button>
      </div>
    </form>
  );
}
