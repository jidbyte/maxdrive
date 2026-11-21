"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { addToCart } from "@/features/storefront/cart/server/actions";

export function AddToCartButton({
  productId,
  productName,
  available,
  variant = "icon",
  className,
}: {
  productId: string;
  productName: string;
  available: number;
  variant?: "icon" | "full";
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = available < 1;

  function add(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    start(async () => {
      const r = await addToCart(productId, variant === "full" ? qty : 1);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
      toast.success(
        (t) => (
          <span className="flex items-center gap-3">
            <span>
              Added <b>{productName}</b>
            </span>
            <Link
              href="/shop/cart"
              onClick={() => toast.dismiss(t.id)}
              className="font-bold whitespace-nowrap text-primary"
            >
              View cart
            </Link>
          </span>
        ),
        { duration: 3500 },
      );
      router.refresh();
    });
  }

  if (variant === "icon") {
    return (
      <Button
        size="icon"
        aria-label={soldOut ? "Out of stock" : `Add ${productName} to cart`}
        disabled={soldOut || pending}
        loading={pending}
        onClick={add}
        className={cn("shrink-0", className)}
      >
        {!pending && (added ? <Check /> : <Plus />)}
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <div className="flex h-12 items-center justify-between rounded-full border border-input bg-surface px-1.5 sm:w-36">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Decrease quantity"
          disabled={qty <= 1 || soldOut}
          onClick={() => setQty((q) => Math.max(1, q - 1))}
        >
          <Minus />
        </Button>
        <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">
          {qty}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Increase quantity"
          disabled={qty >= available || soldOut}
          onClick={() => setQty((q) => Math.min(available, q + 1))}
        >
          <Plus />
        </Button>
      </div>
      <Button size="lg" className="flex-1" disabled={soldOut} loading={pending} onClick={add}>
        {!pending && (added ? <Check /> : <ShoppingCart />)}
        {soldOut ? "Out of stock" : added ? "Added to cart" : "Add to cart"}
      </Button>
    </div>
  );
}
