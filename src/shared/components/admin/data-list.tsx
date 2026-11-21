"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Enables header sorting. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
};

export type DataFilter<T> = { key: string; label: string; predicate: (row: T) => boolean };

export type MobileCard = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Responsive admin list: table ≥ md, stacked cards < md. Client-side search,
 * filter chips, sorting and pagination — fine for the data volumes a single
 * store produces; swap to server pagination if a list grows past ~5k rows.
 */
export function DataList<T>({
  rows,
  getRowId,
  columns,
  mobile,
  rowHref,
  rowActions,
  searchText,
  searchPlaceholder = "Search…",
  filters,
  defaultSort,
  empty,
  pageSize = 20,
  toolbar,
}: {
  rows: T[];
  getRowId: (row: T) => string;
  columns: DataColumn<T>[];
  mobile: (row: T) => MobileCard;
  rowHref?: (row: T) => string;
  rowActions?: (row: T) => React.ReactNode;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: DataFilter<T>[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  empty: { title: string; description?: string; action?: React.ReactNode };
  pageSize?: number;
  toolbar?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const f = filters?.find((x) => x.key === filter);
    let out = rows.filter((r) => (!f || f.predicate(r)) && (!term || !searchText || searchText(r).toLowerCase().includes(term)));
    const col = sort && columns.find((c) => c.key === sort.key);
    if (sort && col?.sortValue) {
      const dir = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const va = col.sortValue!(a);
        const vb = col.sortValue!(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
      });
    }
    return out;
  }, [rows, q, filter, filters, sort, columns, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  function toggleSort(key: string) {
    setPage(0);
    setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
  }

  const counts = useMemo(
    () => Object.fromEntries((filters ?? []).map((f) => [f.key, rows.filter(f.predicate).length])),
    [filters, rows],
  );

  return (
    <div className="space-y-4">
      {(searchText || filters?.length || toolbar) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {searchText ? (
            <Input
              icon={Search}
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              wrapperClassName="lg:max-w-sm"
            />
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {filters && filters.length > 0 && (
              <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:rounded-full sm:bg-surface-2 sm:p-1 sm:px-1">
                {[{ key: "all", label: "All" }, ...filters].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilter(f.key);
                      setPage(0);
                    }}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                      filter === f.key ? "bg-card text-ink shadow-card" : "text-neutral hover:text-ink",
                    )}
                  >
                    {f.label}
                    <span className="text-[11px] text-neutral tabular-nums">{f.key === "all" ? rows.length : counts[f.key]}</span>
                  </button>
                ))}
              </div>
            )}
            {toolbar}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Inbox className="size-10 text-neutral" />
          <div>
            <p className="font-bold text-ink">{rows.length === 0 ? empty.title : "Nothing matches"}</p>
            <p className="mt-1 text-sm text-neutral">
              {rows.length === 0 ? empty.description : "Try a different search or filter."}
            </p>
          </div>
          {rows.length === 0 && empty.action}
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-xs text-neutral">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn("px-4 py-3 font-semibold whitespace-nowrap", c.align === "right" ? "text-right" : "text-left", c.className)}
                    >
                      {c.sortValue ? (
                        <button
                          onClick={() => toggleSort(c.key)}
                          className={cn("inline-flex items-center gap-1 hover:text-ink", c.align === "right" && "flex-row-reverse")}
                        >
                          {c.header}
                          {sort?.key === c.key ? (
                            sort.dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                  {rowActions && <th className="w-px" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((r) => (
                  <tr key={getRowId(r)} className="transition-colors hover:bg-surface-2/50">
                    {columns.map((c, i) => (
                      <td key={c.key} className={cn("px-4 py-3", c.align === "right" && "text-right", c.className)}>
                        {i === 0 && rowHref ? (
                          <Link href={rowHref(r)} className="font-semibold text-ink hover:text-primary">
                            {c.cell(r)}
                          </Link>
                        ) : (
                          c.cell(r)
                        )}
                      </td>
                    ))}
                    {rowActions && <td className="px-2 py-3 text-right whitespace-nowrap">{rowActions(r)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
            {visible.map((r) => {
              const m = mobile(r);
              const body = (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{m.title}</div>
                    {m.subtitle && <div className="mt-0.5 truncate text-xs text-neutral">{m.subtitle}</div>}
                    {m.footer && <div className="mt-2">{m.footer}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {m.value && <div className="text-sm font-bold text-ink tabular-nums">{m.value}</div>}
                    {m.badge}
                  </div>
                </div>
              );
              return (
                <li key={getRowId(r)} className="flex items-center gap-2 p-3">
                  {rowHref ? (
                    <Link href={rowHref(r)} className="min-w-0 flex-1">
                      {body}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">{body}</div>
                  )}
                  {rowActions && <div className="shrink-0">{rowActions(r)}</div>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm text-neutral">
          <span>
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="size-9" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon" className="size-9" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
