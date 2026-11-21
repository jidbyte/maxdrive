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
import { customerSchema, type CustomerInput } from "@/features/admin/customers/server/schema";
import { createCustomer, updateCustomer } from "@/features/admin/customers/server/actions";

export function CustomerForm({ customerId, defaultValues }: { customerId?: string; defaultValues?: Partial<CustomerInput> }) {
  const router = useRouter();
  const [isPending, start] = useActionTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", customerType: "individual", email: "", phone: "", address: "", city: "", notes: "", ...defaultValues },
  });

  const onSubmit = (values: CustomerInput) => {
    setServerError(null);
    start(async () => {
      const r = customerId ? await updateCustomer(customerId, values) : await createCustomer(values);
      if (!r.success) return setServerError(r.error);
      toast.success(customerId ? "Customer updated" : "Customer added");
      const id = customerId ?? (r.data as { id: string }).id;
      router.push(`/admin/customers/${id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </FormField>
        <FormField label="Type" htmlFor="customerType">
          <select id="customerType" className="h-11 w-full rounded-md border border-input bg-surface px-4 text-sm text-ink" {...register("customerType")}>
            <option value="individual">Individual</option>
            <option value="business">Business / fleet</option>
          </select>
        </FormField>
        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" {...register("phone")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </FormField>
        <FormField label="Address" htmlFor="address">
          <Input id="address" {...register("address")} />
        </FormField>
        <FormField label="City" htmlFor="city">
          <Input id="city" {...register("city")} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Notes (staff only)" htmlFor="notes">
            <Textarea id="notes" rows={3} {...register("notes")} />
          </FormField>
        </div>
      </div>
      {serverError && <Message variant="error">{serverError}</Message>}
      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button asChild variant="outline"><Link href={customerId ? `/admin/customers/${customerId}` : "/admin/customers"}>Cancel</Link></Button>
        <Button type="submit" loading={isPending}>{customerId ? "Save changes" : "Add customer"}</Button>
      </div>
    </form>
  );
}
