import Link from "next/link";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { ChevronLeft, Tags } from "lucide-react";

import { db } from "@/shared/db";
import { category, product, productCategory } from "@/shared/db/schema";
import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { CategoriesManager } from "@/features/admin/products/client/categories-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const staff = await requireStaffPage("products.read");

  const rows = await db
    .select({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      productCount: count(product.id),
    })
    .from(category)
    .leftJoin(productCategory, eq(productCategory.categoryId, category.id))
    .leftJoin(product, and(eq(product.id, productCategory.productId), isNull(product.deletedAt)))
    .groupBy(category.id)
    .orderBy(asc(category.sortOrder), asc(category.name));

  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral hover:text-ink">
        <ChevronLeft className="size-4" /> Products
      </Link>
      <PageHeader>
        <PageTitle icon={Tags} description="Organise the catalog. Categories appear as shop navigation and filters.">
          Categories
        </PageTitle>
      </PageHeader>
      <CategoriesManager categories={rows} canManage={staff.permissions.has("products.manage")} />
    </div>
  );
}
