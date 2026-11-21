import { Star } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { Stat, StatGrid } from "@/shared/components/admin/panel";
import { listReviews } from "@/features/admin/reviews/server/queries";
import { ReviewsModeration } from "@/features/admin/reviews/client/reviews-moderation";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  await requireStaffPage("reviews.moderate");
  const reviews = await listReviews();
  const visible = reviews.filter((r) => r.status === "published");
  const avg = visible.length ? visible.reduce((a, r) => a + r.rating, 0) / visible.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Star} description="Verified-purchase reviews shown on product pages. Hide anything inappropriate.">
          Reviews
        </PageTitle>
      </PageHeader>
      <StatGrid>
        <Stat label="Average rating" value={visible.length ? `${avg.toFixed(1)} ★` : "—"} />
        <Stat label="Published" value={visible.length} />
        <Stat label="Needs attention" value={visible.filter((r) => r.rating <= 2).length} tone={visible.some((r) => r.rating <= 2) ? "warning" : undefined} hint="1–2 star reviews" />
        <Stat label="Hidden" value={reviews.length - visible.length} />
      </StatGrid>
      <ReviewsModeration reviews={reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </div>
  );
}
