"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { supplierSchema, type SupplierInput } from "@/features/admin/suppliers/server/schema";
import { createSupplier, deleteSupplier, updateSupplier } from "@/features/admin/suppliers/server/actions";

export function SupplierForm({ supplierId, defaultValues }: { supplierId?: string; defaultValues?: Partial<SupplierInput> }) {
  const router = useRouter();
  const [isPending, start] = useActionTransition();
  const [deleting, startDelete] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { companyName: "", contactName: "", phone: "", email: "", website: "", address: "", ...defaultValues },
  });

  const onSubmit = (values: SupplierInput) => {
    setServerError(null);
    start(async () => {
      const r = supplierId ? await updateSupplier(supplierId, values) : await createSupplier(values);
      if (!r.success) return setServerError(r.error);
      toast.success(supplierId ? "Supplier updated" : "Supplier added");
      router.push("/admin/suppliers");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Company name" htmlFor="companyName" required error={errors.companyName?.message}>
            <Input id="companyName" {...register("companyName")} />
          </FormField>
        </div>
        <FormField label="Contact person" htmlFor="contactName">
          <Input id="contactName" {...register("contactName")} />
        </FormField>
        <FormField label="Phone" htmlFor="phone">
          <Input id="phone" type="tel" {...register("phone")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </FormField>
        <FormField label="Website" htmlFor="website">
          <Input id="website" placeholder="https://" {...register("website")} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Address" htmlFor="address">
            <Input id="address" {...register("address")} />
          </FormField>
        </div>
      </div>
      {serverError && <Message variant="error">{serverError}</Message>}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center">
        {supplierId && (
          <Button
            type="button"
            variant="ghost"
            className="text-danger hover:text-danger sm:mr-auto"
            loading={deleting}
            onClick={() => {
              if (!confirm("Delete this supplier? Past purchase orders are kept.")) return;
              startDelete(async () => {
                const r = await deleteSupplier(supplierId);
                if (!r.success) return void toast.error(r.error);
                toast.success("Supplier deleted");
                router.push("/admin/suppliers");
                router.refresh();
              });
            }}
          >
            {!deleting && <Trash2 />} Delete supplier
          </Button>
        )}
        <Button asChild variant="outline"><Link href="/admin/suppliers">Cancel</Link></Button>
        <Button type="submit" loading={isPending}>{supplierId ? "Save changes" : "Add supplier"}</Button>
      </div>
    </form>
  );
}
