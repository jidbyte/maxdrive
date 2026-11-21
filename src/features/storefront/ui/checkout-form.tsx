"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Lock, Package, Store, Tag, Truck, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import type { CartLine } from "@/features/storefront/cart/server/queries";
import { getCheckoutQuote, placeOrder } from "@/features/storefront/checkout/server/actions";
import type { CheckoutQuote } from "@/features/storefront/checkout/server/quote";
import { checkoutSchema, type CheckoutInput } from "@/features/storefront/checkout/server/schema";

function Choice({
  selected,
  onSelect,
  icon: Icon,
  title,
  hint,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "border-primary bg-primary-soft" : "border-border hover:border-neutral/40",
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", selected ? "text-primary" : "text-neutral")} />
      <span>
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block text-xs text-neutral">{hint}</span>
      </span>
    </button>
  );
}

export function CheckoutForm({
  lines,
  initialQuote,
  defaults,
  signedIn,
}: {
  lines: CartLine[];
  initialQuote: CheckoutQuote;
  defaults: Partial<CheckoutInput>;
  signedIn: boolean;
}) {
  const [quote, setQuote] = useState(initialQuote);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [quoting, startQuote] = useTransition();
  const [placing, startPlace] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const fmt = (n: number) => formatPrice(n, quote.currency);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      notes: "",
      couponCode: "",
      fulfilment: initialQuote.deliveryEnabled ? "delivery" : "pickup",
      paymentMethod: "paystack",
      ...defaults,
    },
  });
  const fulfilment = watch("fulfilment");
  const paymentMethod = watch("paymentMethod");

  function requote(next: { fulfilment?: "delivery" | "pickup"; coupon?: string }) {
    const f = next.fulfilment ?? fulfilment;
    const c = next.coupon ?? watch("couponCode") ?? "";
    startQuote(async () => {
      const q = await getCheckoutQuote(f, c || undefined);
      if (!q) return;
      setQuote(q);
      if (next.coupon !== undefined) {
        if (c && q.couponError) {
          setCouponMsg(q.couponError);
          setValue("couponCode", "");
        } else if (c) {
          setCouponMsg(null);
        }
      }
    });
  }

  function chooseFulfilment(f: "delivery" | "pickup") {
    setValue("fulfilment", f);
    if (f === "delivery") setValue("paymentMethod", "paystack");
    requote({ fulfilment: f });
  }

  function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setValue("couponCode", code);
    requote({ coupon: code });
  }

  function removeCoupon() {
    setValue("couponCode", "");
    setCouponInput("");
    setCouponMsg(null);
    requote({ coupon: "" });
  }

  const onSubmit = (values: CheckoutInput) => {
    setServerError(null);
    startPlace(async () => {
      const r = await placeOrder(values);
      if (!r.success) {
        setServerError(r.error);
        return;
      }
      window.location.assign(r.data.redirectUrl);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start" noValidate>
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-ink">1. Contact</h2>
          {!signedIn && (
            <p className="mt-1 text-sm text-neutral">
              Checking out as a guest.{" "}
              <a href="/sign-in?next=/shop/checkout" className="font-semibold text-primary">
                Sign in
              </a>{" "}
              to save this order to your account.
            </p>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" autoComplete="name" {...register("name")} />
              </FormField>
            </div>
            <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
            </FormField>
            <FormField label="Phone" htmlFor="phone" required error={errors.phone?.message}>
              <Input id="phone" type="tel" autoComplete="tel" placeholder="024 000 0000" {...register("phone")} />
            </FormField>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-ink">2. Delivery</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Choice
              selected={fulfilment === "delivery"}
              onSelect={() => chooseFulfilment("delivery")}
              icon={Truck}
              title="Deliver to me"
              hint={
                quote.freeDeliveryThreshold
                  ? `Free over ${fmt(quote.freeDeliveryThreshold)}`
                  : "Delivered to your address"
              }
              disabled={!quote.deliveryEnabled}
            />
            <Choice
              selected={fulfilment === "pickup"}
              onSelect={() => chooseFulfilment("pickup")}
              icon={Store}
              title="Store pickup"
              hint="Free · collect from MAXDRIVE"
              disabled={!quote.pickupEnabled}
            />
          </div>
          {fulfilment === "delivery" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <FormField label="Delivery address" htmlFor="address" required error={errors.address?.message}>
                  <Input id="address" autoComplete="street-address" placeholder="House no., street, landmark" {...register("address")} />
                </FormField>
              </div>
              <FormField label="City / area" htmlFor="city" required error={errors.city?.message}>
                <Input id="city" autoComplete="address-level2" {...register("city")} />
              </FormField>
            </div>
          )}
          <div className="mt-4">
            <FormField label="Order notes (optional)" htmlFor="notes">
              <Textarea id="notes" rows={2} placeholder="Vehicle details, delivery instructions…" {...register("notes")} />
            </FormField>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-ink">3. Payment</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Choice
              selected={paymentMethod === "paystack"}
              onSelect={() => setValue("paymentMethod", "paystack")}
              icon={CreditCard}
              title="Pay now"
              hint="Card or Mobile Money via Paystack"
            />
            <Choice
              selected={paymentMethod === "pay_on_pickup"}
              onSelect={() => setValue("paymentMethod", "pay_on_pickup")}
              icon={Store}
              title="Pay on pickup"
              hint="Reserve now, pay at the counter"
              disabled={fulfilment !== "pickup"}
            />
          </div>
          {errors.paymentMethod?.message && <p className="mt-2 text-sm text-danger">{errors.paymentMethod.message}</p>}
        </section>
      </div>

      <aside className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold text-ink">Order summary</h2>
        <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                {l.imageUrl ? (
                  <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <Package className="absolute inset-0 m-auto size-5 text-neutral" />
                )}
                <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] leading-5 font-bold text-surface">
                  {l.quantity}
                </span>
              </span>
              <span className="line-clamp-2 flex-1 text-sm text-ink">{l.name}</span>
              <span className="text-sm font-semibold text-ink tabular-nums">{fmt(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-border pt-5">
          {quote.couponCode ? (
            <div className="flex items-center justify-between rounded-2xl bg-success/10 px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 font-semibold text-success">
                <Tag className="size-4" /> {quote.couponCode}
              </span>
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Remove coupon" onClick={removeCoupon}>
                <X />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                aria-label="Coupon code"
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
                className="h-11"
              />
              <Button type="button" variant="outline" onClick={applyCoupon} loading={quoting && !!couponInput}>
                Apply
              </Button>
            </div>
          )}
          {couponMsg && <p className="mt-2 text-xs text-danger">{couponMsg}</p>}
        </div>

        <dl className={cn("mt-5 space-y-2 text-sm transition-opacity", quoting && "opacity-50")}>
          <div className="flex justify-between">
            <dt className="text-neutral">Subtotal</dt>
            <dd className="text-ink tabular-nums">{fmt(quote.subtotal)}</dd>
          </div>
          {quote.discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <dt>Discount</dt>
              <dd className="tabular-nums">−{fmt(quote.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-neutral">{fulfilment === "delivery" ? "Delivery" : "Pickup"}</dt>
            <dd className="text-ink tabular-nums">{quote.deliveryFee > 0 ? fmt(quote.deliveryFee) : "Free"}</dd>
          </div>
          {quote.taxAmount > 0 && (
            <div className="flex justify-between text-neutral">
              <dt>Tax</dt>
              <dd className="tabular-nums">{fmt(quote.taxAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-3 text-base">
            <dt className="font-bold text-ink">Total</dt>
            <dd className="text-xl font-extrabold text-ink tabular-nums">{fmt(quote.totalAmount)}</dd>
          </div>
        </dl>

        {serverError && <Message variant="error" className="mt-4">{serverError}</Message>}

        <Button type="submit" size="lg" className="mt-5 w-full" loading={placing} disabled={quoting}>
          {!placing && <Lock />}
          {paymentMethod === "paystack" ? `Pay ${fmt(quote.totalAmount)}` : "Place order"}
        </Button>
        <p className="mt-3 text-center text-xs text-neutral">
          {paymentMethod === "paystack"
            ? "You'll be redirected to Paystack to pay securely."
            : "Your items will be reserved for pickup."}
        </p>
      </aside>
    </form>
  );
}
