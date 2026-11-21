import { revalidatePath } from "next/cache";

/** Product/category/stock changed → refresh admin lists and the storefront. */
export function revalidateCatalog() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/shop", "layout");
  revalidatePath("/");
}

/** Orders/sales changed. */
export function revalidateOrders() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/account/orders");
}

/** Purchases/receipts changed (also touches stock). */
export function revalidatePurchases() {
  revalidatePath("/admin/purchases");
  revalidateCatalog();
}

/** Income/expense/invoice/coupon changed. */
export function revalidateFinance() {
  revalidatePath("/admin/finance", "layout");
  revalidatePath("/admin");
}
