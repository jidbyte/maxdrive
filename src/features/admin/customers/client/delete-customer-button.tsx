"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { deleteCustomer } from "@/features/admin/customers/server/actions";

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="text-danger hover:text-danger"
      loading={pending}
      onClick={() => {
        if (!confirm("Delete this customer? Their past orders and bookings are kept.")) return;
        start(async () => {
          const r = await deleteCustomer(customerId);
          if (!r.success) return void toast.error(r.error);
          toast.success("Customer deleted");
          router.push("/admin/customers");
          router.refresh();
        });
      }}
    >
      {!pending && <Trash2 />} Delete
    </Button>
  );
}
