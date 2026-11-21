"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Plus, SquarePen, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { cn } from "@/shared/lib/utils";
import { CategoryIcon } from "@/features/storefront/ui/category-icon";
import { CATEGORY_ICONS, type CategoryIconKey } from "@/features/admin/products/category-icons";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/admin/products/server/category-actions";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  productCount: number;
};

type Draft = { name: string; description: string; icon: CategoryIconKey | null; sortOrder: number };

function CategoryDialog({
  open,
  onOpenChange,
  initial,
  categoryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Draft;
  categoryId: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useActionTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = categoryId ? await updateCategory(categoryId, draft) : await createCategory(draft);
      if (!r.success) return setError(r.error);
      toast.success(categoryId ? "Category updated" : "Category created");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{categoryId ? "Edit category" : "New category"}</DialogTitle>
          {categoryId && (
            <DialogDescription>Renaming changes the category&apos;s shop URL.</DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <FormField label="Name" htmlFor="cat-name" required>
            <Input id="cat-name" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </FormField>
          <FormField label="Short description (shown on the category page)" htmlFor="cat-desc">
            <Textarea id="cat-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </FormField>
          <div>
            <p className="mb-2 text-sm text-neutral">Icon</p>
            <div className="grid grid-cols-7 gap-2">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-label={icon}
                  aria-pressed={draft.icon === icon}
                  onClick={() => setDraft({ ...draft, icon })}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl border transition-colors",
                    draft.icon === icon ? "border-primary bg-primary-soft text-primary" : "border-border text-neutral hover:text-ink",
                  )}
                >
                  <CategoryIcon name={icon} className="size-5" />
                </button>
              ))}
            </div>
          </div>
          <FormField label="Sort order (lower shows first)" htmlFor="cat-sort">
            <Input
              id="cat-sort"
              type="number"
              min={0}
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
            />
          </FormField>
          {error && <Message variant="error">{error}</Message>}
          <Button type="submit" className="w-full" loading={pending}>
            {categoryId ? "Save changes" : "Create category"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CategoriesManager({ categories, canManage }: { categories: CategoryRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft; key: number } | null>(null);
  const [pending, start] = useActionTransition();

  const nextSort = (categories.at(-1)?.sortOrder ?? -1) + 1;

  function remove(c: CategoryRow) {
    const msg = c.productCount
      ? `Delete "${c.name}"? ${c.productCount} product(s) will be untagged (not deleted).`
      : `Delete "${c.name}"?`;
    if (!confirm(msg)) return;
    start(async () => {
      const r = await deleteCategory(c.id);
      if (!r.success) toast.error(r.error);
      else toast.success("Category deleted");
      router.refresh();
    });
  }

  return (
    <>
      {canManage && (
        <div className="flex justify-end">
          <Button
            onClick={() =>
              setEditing({ id: null, key: Date.now(), draft: { name: "", description: "", icon: null, sortOrder: nextSort } })
            }
          >
            <Plus /> New category
          </Button>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-neutral">
          No categories yet. Create one, or add categories while editing a product.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <CategoryIcon name={c.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{c.name}</p>
                <p className="text-xs text-neutral">
                  {c.productCount} product{c.productCount === 1 ? "" : "s"} · #{c.sortOrder}
                </p>
              </div>
              <div className="flex shrink-0">
                <Button asChild variant="ghost" size="icon" aria-label={`Open ${c.name} in shop`}>
                  <Link href={`/shop/c/${c.slug}`} target="_blank">
                    <ExternalLink />
                  </Link>
                </Button>
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${c.name}`}
                      onClick={() =>
                        setEditing({
                          id: c.id,
                          key: Date.now(),
                          draft: {
                            name: c.name,
                            description: c.description ?? "",
                            icon: (CATEGORY_ICONS as readonly string[]).includes(c.icon ?? "") ? (c.icon as CategoryIconKey) : null,
                            sortOrder: c.sortOrder,
                          },
                        })
                      }
                    >
                      <SquarePen />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} disabled={pending} onClick={() => remove(c)}>
                      <Trash2 className="text-danger" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CategoryDialog
          key={editing.key}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          initial={editing.draft}
          categoryId={editing.id}
        />
      )}
    </>
  );
}
