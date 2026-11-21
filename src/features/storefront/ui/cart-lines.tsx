"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle, Minus, Package, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { removeCartItem, updateCartItemQuantity } from "@/features/storefront/cart/server/actions";
import type { CartLine } from "@/features/storefront/cart/server/queries";

function Line({ line, currency }: { line: CartLine; currency: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setQty(q: number) {
    start(async () => {
      const r = q < 1 ? await removeCartItem(line.id) : await updateCartItemQuantity(line.id, q);
      if (!r.success) toast.error(r.error);
      router.refresh();
    });
  }

  return (
    <li className={cn("flex gap-4 py-5 transition-opacity", pending && "opacity-60")}>
      <Link
        href={`/shop/p/${line.slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2 sm:size-24"
      >
        {line.imageUrl ? (
          <Image src={line.imageUrl} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <Package className="absolute inset-0 m-auto size-8 text-neutral" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href={`/shop/p/${line.slug}`} className="line-clamp-2 font-bold text-ink hover:text-primary">
            {line.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-neutral">
            {[line.brand, line.partNumber && `Part # ${line.partNumber}`].filter(Boolean).join(" · ")}
          </p>
          {line.issue && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <AlertTriangle className="size-3.5" />
              {line.issue === "unavailable"
                ? "No longer available — please remove"
                : `Only ${line.available} in stock`}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <span className="font-extrabold text-ink tabular-nums">
            {formatPrice(line.unitPrice * line.quantity, currency)}
          </span>
          <div className="flex items-center gap-1">
            <div className="flex h-10 items-center rounded-full border border-input px-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Decrease quantity"
                disabled={pending}
                onClick={() => setQty(line.quantity - 1)}
              >
                <Minus />
              </Button>
              <span className="w-7 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Increase quantity"
                disabled={pending || line.quantity >= line.available}
                onClick={() => setQty(line.quantity + 1)}
              >
                <Plus />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${line.name}`}
              disabled={pending}
              onClick={() => setQty(0)}
            >
              <Trash2 className="text-neutral" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartLines({ lines, currency }: { lines: CartLine[]; currency: string }) {
  return (
    <ul className="divide-y divide-border">
      {lines.map((l) => (
        <Line key={l.id} line={l} currency={currency} />
      ))}
    </ul>
  );
}
