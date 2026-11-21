"use client";

import * as React from "react";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import Link from "next/link";
import type { RowSelectionState } from "@tanstack/react-table";
import { Boxes, Download, Package, PlusCircle, Search, Tags, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  PageHeader,
  PageTitle,
  PageAction,
} from "@/shared/components/common/page-header";
import {
  ProductsTable,
  type ProductRow,
} from "@/features/admin/products/client/products-table";
import { deleteProduct } from "@/features/admin/products/server/actions";

const ALL_CATEGORIES = "__all__";
type StockFilter = "all" | "low" | "out" | "hidden";

function exportToCsv(rows: ProductRow[]) {
  const header = [
    "Name",
    "SKU",
    "Category",
    "Price",
    "Quantity",
    "Restock level",
    "Status",
  ];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  const lines = rows.map((r) =>
    [
      escape(r.name),
      escape(r.sku),
      escape(r.categories.join("; ")),
      escape(r.sellingPrice),
      escape(r.quantity),
      escape(r.restockLevel),
      escape(r.isActive ? "Active" : "Inactive"),
    ].join(","),
  );

  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductsPageClient({
  currency,
  products,
}: {
  currency: string;
  products: ProductRow[];
}) {
  const [isPending, startTransition] = useActionTransition();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL_CATEGORIES);
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [exportOpen, setExportOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.categories.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [products]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.partNumber ?? "").toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.oemNumbers ?? []).some((o) => o.toLowerCase().includes(q));
      const matchesCategory =
        category === ALL_CATEGORIES || p.categories.includes(category);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "out" && p.quantity <= 0) ||
        (stockFilter === "low" && p.quantity > 0 && p.quantity <= p.restockLevel) ||
        (stockFilter === "hidden" && !p.isActive);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, category, stockFilter]);

  const selectedIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id],
  );
  const selectedCount = selectedIds.length;

  const handleConfirmBulkDelete = () => {
    startTransition(async () => {
      await Promise.all(selectedIds.map((id) => deleteProduct(id)));
      setRowSelection({});
      setDeleteDialogOpen(false);
    });
  };

  const handleConfirmExport = () => {
    const toExport =
      selectedCount > 0 ? filtered.filter((p) => rowSelection[p.id]) : filtered;
    exportToCsv(toExport);
    setExportOpen(false);
  };

  const exportCount = selectedCount > 0 ? selectedCount : filtered.length;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Package} description={`${products.length} product${products.length === 1 ? "" : "s"} in your catalog`}>
          Products
        </PageTitle>
        <PageAction>
          <Button asChild variant="ghost">
            <Link href="/admin/products/categories">
              <Tags /> Categories
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/inventory">
              <Boxes /> Inventory
            </Link>
          </Button>
          <Popover open={exportOpen} onOpenChange={setExportOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="hidden md:inline-flex">
                <Download /> Export
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">Export as CSV</p>
                <p className="text-xs text-neutral">
                  {exportCount} product{exportCount === 1 ? "" : "s"} will be exported.
                </p>
              </div>
              <Button size="sm" className="w-full" onClick={handleConfirmExport}>
                Download
              </Button>
            </PopoverContent>
          </Popover>
          <Button asChild>
            <Link href="/admin/products/new">
              <PlusCircle /> Add product
            </Link>
          </Button>
        </PageAction>
      </PageHeader>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search name, SKU, part or OEM number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
          wrapperClassName="lg:max-w-md"
        />
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" size="sm" loading={isPending} onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 /> Delete ({selectedCount})
            </Button>
          )}
          <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ProductsTable
        currency={currency}
        products={filtered}
       
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isPending) setDeleteDialogOpen(open);
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              Delete {selectedCount} product{selectedCount === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              They&apos;ll be removed from your catalog and storefront. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending} loading={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={isPending} loading={isPending}
              onClick={handleConfirmBulkDelete}
            >
              {isPending ? "Deleting..." : "Yes, delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
