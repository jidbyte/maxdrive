"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, EyeOff, Plus, SquarePen, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { CategoryIcon } from "@/features/storefront/ui/category-icon";
import { CATEGORY_ICONS, type CategoryIconKey } from "@/features/admin/products/category-icons";
import { deleteService, saveService, type ServiceInput } from "@/features/workshop/server/service-actions";

export type ServiceRow = ServiceInput & { id: string };

const EMPTY: ServiceInput = {
  name: "",
  category: "",
  summary: "",
  description: "",
  durationMinutes: 60,
  basePrice: 0,
  priceIsFrom: false,
  icon: "wrench",
  isActive: true,
  sortOrder: 0,
};

function ServiceDialog({ id, initial, onClose }: { id: string | null; initial: ServiceInput; onClose: () => void }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useActionTransition();
  const set = <K extends keyof ServiceInput>(k: K, v: ServiceInput[K]) => setD((x) => ({ ...x, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{id ? "Edit service" : "New service"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const r = await saveService(id, d);
              if (!r.success) return setError(r.error);
              toast.success("Service saved");
              onClose();
              router.refresh();
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Name" htmlFor="sv-name" required>
                <Input id="sv-name" value={d.name} onChange={(e) => set("name", e.target.value)} />
              </FormField>
            </div>
            <FormField label="Category" htmlFor="sv-cat">
              <Input id="sv-cat" placeholder="Maintenance, Brakes…" value={d.category ?? ""} onChange={(e) => set("category", e.target.value)} />
            </FormField>
            <FormField label="Duration (minutes)" htmlFor="sv-dur" required>
              <Input id="sv-dur" type="number" min={10} step={5} value={d.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value) || 0)} />
            </FormField>
            <FormField label="Price" htmlFor="sv-price" required>
              <Input id="sv-price" type="number" min={0} value={d.basePrice} onChange={(e) => set("basePrice", Number(e.target.value) || 0)} />
            </FormField>
            <FormField label="Sort order" htmlFor="sv-sort">
              <Input id="sv-sort" type="number" min={0} value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Short summary (shown on cards)" htmlFor="sv-sum">
                <Textarea id="sv-sum" rows={2} value={d.summary ?? ""} onChange={(e) => set("summary", e.target.value)} />
              </FormField>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-neutral">Icon</p>
            <div className="grid grid-cols-7 gap-2">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-label={icon}
                  aria-pressed={d.icon === icon}
                  onClick={() => set("icon", icon)}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl border",
                    d.icon === icon ? "border-primary bg-primary-soft text-primary" : "border-border text-neutral",
                  )}
                >
                  <CategoryIcon name={icon} className="size-5" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-ink">
              <Checkbox checked={d.priceIsFrom} onCheckedChange={(v) => set("priceIsFrom", !!v)} /> Show as “from” price
            </label>
            <label className="flex items-center gap-3 text-sm text-ink">
              <Checkbox checked={d.isActive} onCheckedChange={(v) => set("isActive", !!v)} /> Bookable online
            </label>
          </div>
          {error && <Message variant="error">{error}</Message>}
          <Button type="submit" className="w-full" loading={pending}>
            Save service
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ServicesManager({ services, currency }: { services: ServiceRow[]; currency: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; data: ServiceInput; key: number } | null>(null);
  const [pending, start] = useActionTransition();

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: null, key: Date.now(), data: { ...EMPTY, sortOrder: services.length } })}>
          <Plus /> New service
        </Button>
      </div>
      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-neutral">
          No services yet. Add your first one so customers can book online.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {services.map((s) => (
            <li key={s.id} className={cn("flex gap-4 rounded-xl border border-border bg-card p-4 shadow-card", !s.isActive && "opacity-70")}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <CategoryIcon name={s.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-ink">{s.name}</p>
                  {!s.isActive && <Badge variant="secondary"><EyeOff /> Hidden</Badge>}
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-neutral">{s.summary || s.category || "—"}</p>
                <p className="mt-2 flex items-center gap-3 text-xs font-semibold text-neutral">
                  <span className="flex items-center gap-1"><Clock className="size-3.5" /> {s.durationMinutes} min</span>
                  <span className="text-ink">{s.priceIsFrom ? "from " : ""}{formatPrice(s.basePrice, currency)}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${s.name}`}
                  onClick={() => {
                    const { id, ...data } = s;
                    setEditing({ id, key: Date.now(), data: { ...data, icon: (CATEGORY_ICONS as readonly string[]).includes(data.icon ?? "") ? (data.icon as CategoryIconKey) : null } });
                  }}
                >
                  <SquarePen />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${s.name}`}
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete "${s.name}"? Existing bookings keep their history.`)) return;
                    start(async () => {
                      const r = await deleteService(s.id);
                      if (!r.success) toast.error(r.error);
                      else toast.success("Service deleted");
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="text-danger" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <ServiceDialog key={editing.key} id={editing.id} initial={editing.data} onClose={() => setEditing(null)} />}
    </>
  );
}
