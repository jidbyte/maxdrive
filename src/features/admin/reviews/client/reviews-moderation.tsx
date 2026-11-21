"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { DataList } from "@/shared/components/admin/data-list";
import { deleteReview, setReviewVisibility } from "@/features/admin/reviews/server/actions";
import { StarRatingDisplay } from "./star-rating";

export type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  buyerName: string;
  status: "published" | "hidden";
  createdAt: string;
  productName: string;
  productSlug: string;
};

function Actions({ r }: { r: ReviewRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.success) toast.error(res.error ?? "Failed");
      else toast.success(msg);
      router.refresh();
    });
  return (
    <span className="flex">
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label={r.status === "hidden" ? "Show review" : "Hide review"}
        onClick={() => run(() => setReviewVisibility(r.id, r.status === "hidden"), r.status === "hidden" ? "Review visible" : "Review hidden")}
      >
        {r.status === "hidden" ? <Eye /> : <EyeOff />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label="Delete review"
        onClick={() => confirm("Delete this review permanently from the shop?") && run(() => deleteReview(r.id), "Review deleted")}
      >
        <Trash2 className="text-danger" />
      </Button>
    </span>
  );
}

export function ReviewsModeration({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <DataList
      rows={reviews}
      getRowId={(r) => r.id}
      searchText={(r) => `${r.productName} ${r.buyerName} ${r.title ?? ""} ${r.body}`}
      searchPlaceholder="Search reviews"
      defaultSort={{ key: "date", dir: "desc" }}
      filters={[
        { key: "low", label: "1–2 stars", predicate: (r) => r.rating <= 2 },
        { key: "high", label: "4–5 stars", predicate: (r) => r.rating >= 4 },
        { key: "hidden", label: "Hidden", predicate: (r) => r.status === "hidden" },
      ]}
      columns={[
        {
          key: "review",
          header: "Review",
          cell: (r) => (
            <span className="block max-w-xl">
              <span className="flex items-center gap-2">
                <StarRatingDisplay rating={r.rating} size="md" />
                {r.status === "hidden" && <Badge variant="secondary">Hidden</Badge>}
              </span>
              {r.title && <span className="mt-1 block font-semibold text-ink">{r.title}</span>}
              <span className="mt-0.5 line-clamp-2 block text-sm text-neutral">{r.body}</span>
            </span>
          ),
          sortValue: (r) => r.rating,
        },
        {
          key: "product",
          header: "Product",
          cell: (r) => (
            <Link href={`/shop/p/${r.productSlug}`} target="_blank" className="text-sm text-primary hover:underline">
              {r.productName}
            </Link>
          ),
        },
        { key: "buyer", header: "By", cell: (r) => <span className="text-sm text-ink">{r.buyerName}</span> },
        { key: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap text-neutral">{new Date(r.createdAt).toLocaleDateString()}</span>, sortValue: (r) => r.createdAt },
      ]}
      rowActions={(r) => <Actions r={r} />}
      mobile={(r) => ({
        title: <StarRatingDisplay rating={r.rating} size="md" />,
        subtitle: `${r.productName} · ${r.buyerName}`,
        footer: <p className="line-clamp-3 text-sm text-ink">{r.title ? <b>{r.title} — </b> : null}{r.body}</p>,
        badge: r.status === "hidden" ? <Badge variant="secondary">Hidden</Badge> : undefined,
      })}
      empty={{ title: "No reviews yet", description: "Verified buyers can review products from their order history." }}
    />
  );
}
