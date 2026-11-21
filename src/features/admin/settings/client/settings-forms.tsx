"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { FormField } from "@/shared/components/common/form-field";
import { CURRENCIES } from "@/shared/config/currencies";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import {
  updateCommerceSettings,
  updateGeneralSettings,
  updateNotificationSettings,
} from "@/features/admin/settings/server/actions";
import type {
  CommerceSettingsInput,
  GeneralSettingsInput,
  NotificationSettingsInput,
} from "@/features/admin/settings/server/schema";

function useSave() {
  const router = useRouter();
  const [isPending, start] = useActionTransition();
  const [error, setError] = useState<string | null>(null);
  function save(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.success) {
        setError(r.error ?? "Couldn't save.");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    }, "Saving…");
  }
  return { isPending, error, save };
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <header className="mb-5">
        <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function FormFooter({ isPending, error }: { isPending: boolean; error: string | null }) {
  return (
    <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
      {error && <p className="text-sm text-danger sm:mr-auto">{error}</p>}
      <Button type="submit" loading={isPending}>
        Save changes
      </Button>
    </div>
  );
}

const selectClass =
  "h-11 w-full rounded-md border border-input bg-surface px-4 text-base text-ink sm:text-sm focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 outline-none";

export function GeneralSettingsForm({ defaultValues }: { defaultValues: GeneralSettingsInput }) {
  const { isPending, error, save } = useSave();
  const { register, handleSubmit, formState } = useForm<GeneralSettingsInput>({ defaultValues });
  const e = formState.errors;

  return (
    <form onSubmit={handleSubmit((v) => save(() => updateGeneralSettings(v)))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Store name" htmlFor="name" required error={e.name?.message}>
          <Input id="name" {...register("name", { required: "Required" })} />
        </FormField>
        <FormField label="Legal / registered name" htmlFor="legalName">
          <Input id="legalName" {...register("legalName")} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Tagline" htmlFor="tagline">
            <Input id="tagline" placeholder="Parts that fit. Service you trust." {...register("tagline")} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="About the business" htmlFor="description">
            <Textarea id="description" rows={4} {...register("description")} />
          </FormField>
        </div>
        <FormField label="Contact email" htmlFor="email">
          <Input id="email" type="email" {...register("email")} />
        </FormField>
        <FormField label="Phone" htmlFor="phone">
          <Input id="phone" type="tel" {...register("phone")} />
        </FormField>
        <FormField label="WhatsApp number" htmlFor="whatsappPhone">
          <Input id="whatsappPhone" type="tel" {...register("whatsappPhone")} />
        </FormField>
        <FormField label="Currency" htmlFor="currency" required>
          <select id="currency" className={selectClass} {...register("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Street address" htmlFor="address">
          <Input id="address" {...register("address")} />
        </FormField>
        <FormField label="City" htmlFor="city">
          <Input id="city" {...register("city")} />
        </FormField>
      </div>
      <FormFooter isPending={isPending} error={error} />
    </form>
  );
}

type CommerceFormValues = Omit<CommerceSettingsInput, "taxRateBps" | "freeDeliveryThreshold"> & {
  taxRatePercent: number;
  freeDeliveryThreshold: number | "";
};

export function CommerceSettingsForm({ defaultValues }: { defaultValues: CommerceSettingsInput }) {
  const { isPending, error, save } = useSave();
  const { register, handleSubmit, watch, setValue } = useForm<CommerceFormValues>({
    defaultValues: {
      ...defaultValues,
      taxRatePercent: defaultValues.taxRateBps / 100,
      freeDeliveryThreshold: defaultValues.freeDeliveryThreshold ?? "",
    },
  });

  const toggles: Array<{ key: "taxInclusive" | "deliveryEnabled" | "pickupEnabled"; label: string; hint: string }> = [
    { key: "deliveryEnabled", label: "Offer delivery", hint: "Customers can have orders delivered." },
    { key: "pickupEnabled", label: "Offer store pickup", hint: "Customers can collect from the store (and pay on pickup)." },
    { key: "taxInclusive", label: "Prices include tax", hint: "Turn off to add tax on top of listed prices at checkout." },
  ];

  return (
    <form
      onSubmit={handleSubmit((v) =>
        save(() =>
          updateCommerceSettings({
            taxRateBps: Math.round(Number(v.taxRatePercent) * 100),
            taxInclusive: v.taxInclusive,
            deliveryEnabled: v.deliveryEnabled,
            pickupEnabled: v.pickupEnabled,
            deliveryFee: Number(v.deliveryFee),
            freeDeliveryThreshold: v.freeDeliveryThreshold === "" ? null : Number(v.freeDeliveryThreshold),
            lowStockThreshold: Number(v.lowStockThreshold),
          }),
        ),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Delivery fee" htmlFor="deliveryFee">
          <Input id="deliveryFee" type="number" min={0} inputMode="numeric" {...register("deliveryFee", { valueAsNumber: true })} />
        </FormField>
        <FormField label="Free delivery from (leave empty for never)" htmlFor="freeDeliveryThreshold">
          <Input id="freeDeliveryThreshold" type="number" min={0} inputMode="numeric" {...register("freeDeliveryThreshold")} />
        </FormField>
        <FormField label="Tax rate (%)" htmlFor="taxRatePercent">
          <Input id="taxRatePercent" type="number" min={0} max={50} step="0.01" {...register("taxRatePercent", { valueAsNumber: true })} />
        </FormField>
        <FormField label="Default low-stock threshold" htmlFor="lowStockThreshold">
          <Input id="lowStockThreshold" type="number" min={0} {...register("lowStockThreshold", { valueAsNumber: true })} />
        </FormField>
      </div>
      <div className="mt-6 space-y-4">
        {toggles.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={watch(t.key)}
              onCheckedChange={(v) => setValue(t.key, !!v, { shouldDirty: true })}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-semibold text-ink">{t.label}</span>
              <span className="block text-neutral">{t.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <FormFooter isPending={isPending} error={error} />
    </form>
  );
}

export function NotificationSettingsForm({ defaultValues }: { defaultValues: NotificationSettingsInput }) {
  const { isPending, error, save } = useSave();
  const { register, handleSubmit, watch, setValue } = useForm<NotificationSettingsInput>({ defaultValues });

  return (
    <form onSubmit={handleSubmit((v) => save(() => updateNotificationSettings(v)))}>
      <div className="space-y-4">
        {(
          [
            ["emailNotificationsEnabled", "Email notifications", "Order confirmations to customers and new-order alerts to staff."],
            ["whatsappNotificationsEnabled", "WhatsApp notifications", "Order confirmations and alerts via WhatsApp templates."],
          ] as const
        ).map(([key, label, hint]) => (
          <label key={key} className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={watch(key)} onCheckedChange={(v) => setValue(key, !!v)} className="mt-0.5" />
            <span className="text-sm">
              <span className="font-semibold text-ink">{label}</span>
              <span className="block text-neutral">{hint}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-6 max-w-md">
        <FormField label="Send new-order alerts to (defaults to the store email)" htmlFor="orderAlertEmail">
          <Input id="orderAlertEmail" type="email" placeholder="orders@maxdrive.com" {...register("orderAlertEmail")} />
        </FormField>
      </div>
      <FormFooter isPending={isPending} error={error} />
    </form>
  );
}
