"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { lookupOrder } from "@/features/storefront/orders/server/actions";

export function TrackOrderForm() {
  const router = useRouter();
  const [saleNumber, setSaleNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await lookupOrder({ saleNumber, email });
          if (!r.success) setError(r.error);
          else router.push(r.data.url);
        });
      }}
    >
      <FormField label="Order number" htmlFor="saleNumber" required>
        <Input
          id="saleNumber"
          placeholder="MD-261108-7KQ4M"
          autoCapitalize="characters"
          value={saleNumber}
          onChange={(e) => setSaleNumber(e.target.value.toUpperCase())}
          className="font-mono"
          required
        />
      </FormField>
      <FormField label="Email" htmlFor="email" required>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </FormField>
      {error && <Message variant="error">{error}</Message>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Find my order
      </Button>
    </form>
  );
}
