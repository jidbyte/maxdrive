"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Dot,
  PackageX,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { placeholderAssets } from "@/assets/placeholder";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  model?: string;
  partNumber?: string | null;
  oemNumbers?: string[];
  isFeatured?: boolean;
  sellingPrice: number;
  quantity: number;
  restockLevel: number;
  isActive: boolean;
  primaryImageUrl: string | null;
  categories: string[];
};

function SortButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 cursor-pointer items-center gap-1.5 text-neutral hover:text-ink"
    >
      <span className="text-xs font-semibold">
        {label}
      </span>
      <ArrowUpDown className="size-3.5" />
    </button>
  );
}

export function createProductColumns(
  currency: string,
): ColumnDef<ProductRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={`Select ${row.original.name}`}
        />
      ),
      enableSorting: false,
    },
    {
      id: "image",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="relative size-12 overflow-hidden rounded-xl bg-surface-2">
          <Image
            src={row.original.primaryImageUrl || placeholderAssets.noImage}
            alt={row.original.name}
            fill
            unoptimized={!!row.original.primaryImageUrl}
            className="object-cover"
          />
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortButton
          label="Name"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => {
        const subtitle =
          [row.original.brand, row.original.model]
            .filter(Boolean)
            .join(" · ") || row.original.sku;
        return (
          <div className="max-w-[320px] truncate">
            <Link href={`/admin/products/${row.original.id}`} className="font-semibold text-ink hover:text-primary">
              {row.original.name}
            </Link>
            <p className="truncate text-xs text-neutral">
              {subtitle}
              {row.original.partNumber && <span className="font-mono"> · {row.original.partNumber}</span>}
            </p>
            {(!row.original.isActive || row.original.isFeatured) && (
              <div className="mt-1 flex gap-1">
                {!row.original.isActive && <Badge variant="secondary">Hidden</Badge>}
                {row.original.isFeatured && <Badge>Featured</Badge>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <span className="truncate font-mono text-xs text-neutral">{row.original.sku}</span>
      ),
    },
    {
      id: "categories",
      header: "Category",
      enableSorting: false,
      cell: ({ row }) => {
        const categories = row.original.categories;
        if (categories.length === 0) {
          return <span className="text-neutral">—</span>;
        }

        const [first, ...rest] = categories;

        return (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">{first}</Badge>
            {rest.length > 0 && (
              <Badge variant="outline">+{rest.length}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "sellingPrice",
      header: ({ column }) => (
        <SortButton
          label="Price"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => {
        const sellingPrice = formatPrice(row.original.sellingPrice, currency);
        return (
          <span className="font-semibold text-ink tabular-nums">{sellingPrice}</span>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <SortButton
          label="In Stock"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => {
        const { quantity, restockLevel } = row.original;
        const low = quantity > 0 && quantity <= restockLevel;

        if (quantity === 0) {
          return (
            <Badge variant="destructive">
              Out of stock
            </Badge>
          );
        }

        return (
          <span className="flex items-center gap-2">
            <span className="font-semibold text-ink tabular-nums">{quantity}</span>
            {low && <Badge variant="warning">Low</Badge>}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end -ml-8">
          <Button asChild size="sm" variant="link">
            <Link href={`/admin/products/${row.original.id}`}>
              View details <ArrowRight />
            </Link>
          </Button>
        </div>
      ),
    },
  ];
}

export function ProductsTable({
  currency,
  products,
  rowSelection,
  onRowSelectionChange,
}: {
  currency: string;
  products: ProductRow[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (state: RowSelectionState) => void;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = React.useMemo(
    () => createProductColumns(currency),
    [currency],
  );

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting, rowSelection, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const currentPage = pagination.pageIndex + 1;

  return (
    <div className="space-y-3">
      {/* Desktop / tablet: table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-card md:block">
        <Table>
          <TableHeader className="bg-surface-2/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold text-neutral"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "border-l-2 border-l-transparent",
                    row.getIsSelected() && "border-l-primary bg-primary-soft",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-16 text-center text-neutral"
                >
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <PackageX className="size-12 text-neutral" />
                    <p className="text-neutral text-base mt-2">
                      No matching results. <br /> Try a different search.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: card list */}
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <PackageX className="size-8 text-neutral" />
            <p className="text-neutral">
              No matching results. <br /> Try a different search.
            </p>
          </div>
        )}

        {rows.map((row) => {
          const p = row.original;
          const low = p.quantity <= p.restockLevel;
          const subtitle =
            [p.brand, p.model].filter(Boolean).join(" · ") || p.sku;
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 p-3",
                row.getIsSelected() && "bg-primary-soft",
              )}
            >
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(v) => row.toggleSelected(!!v)}
                aria-label={`Select ${p.name}`}
              />

              <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                <Image
                  src={p.primaryImageUrl || placeholderAssets.noImage}
                  alt={p.name}
                  fill
                  unoptimized={!!p.primaryImageUrl}
                  className="object-cover"
                />
              </div>

              <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink hover:underline">
                  {p.name}
                </p>
                <div className="flex items-center gap-0.5 text-xs text-neutral">
                  <span className="truncate">{subtitle}</span>
                  {p.categories[0] && (
                    <>
                      <Dot className="size-5" />
                      <span className="truncate">{p.categories[0]}</span>
                    </>
                  )}
                </div>
              </Link>

              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-ink">
                  {formatPrice(p.sellingPrice, currency)}
                </p>
                <p
                  className={cn(
                    "text-xs font-medium tracking-wide",
                    p.quantity === 0
                      ? "text-danger"
                      : low
                        ? "text-warning"
                        : "text-neutral",
                  )}
                >
                  {p.quantity === 0 ? "Out of stock" : `${p.quantity} in stock`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pageCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-sm text-neutral">
            <span>Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) =>
                setPagination((p) => ({
                  ...p,
                  pageSize: Number(v),
                  pageIndex: 0,
                }))
              }
            >
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral">
              Page {currentPage} of {pageCount}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
