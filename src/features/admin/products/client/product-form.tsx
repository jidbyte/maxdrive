"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Loader2, PackagePlus, Sparkles } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { PageAction, PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { Message } from "@/shared/components/common/message";
import { FormField } from "@/shared/components/common/form-field";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import {
  createProductSchema,
  type CreateProductInput,
  type CreateProductOutput,
  type FitmentInput,
} from "@/features/admin/products/server/schema";
import { createProduct, updateProduct } from "@/features/admin/products/server/actions";
import { generateProductDescription } from "@/features/admin/products/server/ai";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { CategorySelector } from "./category-selector";
import { FitmentEditor, type VehicleOption } from "./fitment-editor";

const DESCRIPTION_MAX = 2000;

const selectClass =
  "h-11 w-full rounded-md border border-input bg-surface px-4 text-base text-ink sm:text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

function Panel({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-neutral">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function parseOem(text: string): string[] {
  return Array.from(new Set(text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean))).slice(0, 30);
}

export function ProductForm({
  currency,
  productId,
  defaultValues,
  vehicles,
  canAdjustStock = true,
}: {
  currency: string;
  productId?: string;
  defaultValues?: Partial<CreateProductInput>;
  vehicles: VehicleOption[];
  canAdjustStock?: boolean;
}) {
  const router = useRouter();
  const isEdit = !!productId;
  const [isPending, startTransition] = useActionTransition();
  const [isGenerating, startGenerating] = useActionTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>((defaultValues?.images as UploadedImage[] | undefined) ?? []);
  const [fitments, setFitments] = useState<FitmentInput[]>((defaultValues?.fitments as FitmentInput[] | undefined) ?? []);
  const [oemText, setOemText] = useState((defaultValues?.oemNumbers ?? []).join("\n"));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProductInput, unknown, CreateProductOutput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      partNumber: "",
      brand: "",
      model: "",
      description: "",
      condition: "new",
      warrantyMonths: null,
      sellingPrice: 0,
      compareAtPrice: null,
      costPrice: 0,
      quantity: 0,
      restockLevel: 10,
      isActive: true,
      isFeatured: false,
      isUniversal: false,
      categories: [],
      images: [],
      fitments: [],
      oemNumbers: [],
      ...defaultValues,
    },
  });

  const description = watch("description") ?? "";
  const categories = watch("categories") ?? [];
  const selling = Number(watch("sellingPrice")) || 0;
  const cost = Number(watch("costPrice")) || 0;
  const isUniversal = !!watch("isUniversal");
  const margin = selling > 0 ? ((selling - cost) / selling) * 100 : 0;
  const cancelHref = isEdit ? `/admin/products/${productId}` : "/admin/products";

  const handleGenerateDescription = () => {
    const name = watch("name");
    if (!name?.trim()) {
      toast.error("Add a product name first so AI has something to work with.");
      return;
    }
    startGenerating(async () => {
      const result = await generateProductDescription({
        name,
        brand: watch("brand") || undefined,
        model: watch("model") || undefined,
        categories,
        sellingPrice: selling,
        currency,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setValue("description", result.description, { shouldValidate: true });
      toast.success("Description generated");
    });
  };

  const onSubmit = (values: CreateProductOutput) => {
    setServerError(null);
    const incomplete = fitments.some((f) => !f.makeId);
    if (!values.isUniversal && incomplete) {
      setServerError("Choose a make for every vehicle row, or remove empty rows.");
      return;
    }
    const payload: CreateProductInput = {
      ...values,
      images,
      oemNumbers: parseOem(oemText),
      fitments: values.isUniversal ? [] : fitments,
    };
    startTransition(async () => {
      const result = isEdit ? await updateProduct(productId!, payload) : await createProduct(payload);
      if (!result.success) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Product updated" : "Product created");
      const id = isEdit ? productId! : (result.data as { id: string }).id;
      router.push(`/admin/products/${id}`);
      router.refresh();
    }, "Saving product…");
  };

  const toggles: Array<{ key: "isActive" | "isFeatured" | "isUniversal"; label: string; hint: string }> = [
    { key: "isActive", label: "Visible in shop", hint: "Turn off to hide from the storefront without deleting." },
    { key: "isFeatured", label: "Featured", hint: "Show on the home page." },
    { key: "isUniversal", label: "Universal fit", hint: "Fits most vehicles (oils, wipers, bulbs…)." },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-24 lg:pb-0" noValidate>
      <PageHeader>
        <PageTitle icon={PackagePlus} description={isEdit ? "Update details, pricing, fitment and media." : "Add a part to your catalog."}>
          {isEdit ? "Edit product" : "New product"}
        </PageTitle>
        <PageAction className="hidden lg:flex">
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </PageAction>
      </PageHeader>

      {serverError && <Message variant="error" className="mt-4">{serverError}</Message>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Panel title="Basics">
            <div className="space-y-4">
              <FormField label="Product name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" placeholder="e.g. Ceramic Front Brake Pad Set" {...register("name")} />
              </FormField>
              <FormField label="Description" htmlFor="description" error={errors.description?.message}>
                <Textarea id="description" rows={5} maxLength={DESCRIPTION_MAX} {...register("description")} />
                <div className="mt-1.5 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                  >
                    {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {isGenerating ? "Writing…" : "Write with AI"}
                  </button>
                  <span className={cn("text-xs text-neutral tabular-nums", description.length >= DESCRIPTION_MAX && "text-warning")}>
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Brand" htmlFor="brand">
                  <Input id="brand" placeholder="Bosch, Denso, Toyota Genuine…" {...register("brand")} />
                </FormField>
                <FormField label="Product line / model" htmlFor="model">
                  <Input id="model" {...register("model")} />
                </FormField>
                <FormField label="Condition" htmlFor="condition">
                  <select id="condition" className={selectClass} {...register("condition")}>
                    <option value="new">New</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="used">Used</option>
                  </select>
                </FormField>
                <FormField label="Warranty (months)" htmlFor="warrantyMonths">
                  <Input
                    id="warrantyMonths"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    {...register("warrantyMonths", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                  />
                </FormField>
              </div>
            </div>
          </Panel>

          <Panel title="Identification" description="Shoppers can search by any of these numbers.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="SKU" htmlFor="sku" required error={errors.sku?.message}>
                <Input id="sku" className="font-mono" placeholder="MD-BRK-1187" {...register("sku")} />
              </FormField>
              <FormField label="Manufacturer part number" htmlFor="partNumber">
                <Input id="partNumber" className="font-mono" placeholder="0 986 494 524" {...register("partNumber")} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="OEM / cross-reference numbers (one per line or comma-separated)" htmlFor="oem">
                  <Textarea
                    id="oem"
                    rows={3}
                    className="font-mono"
                    placeholder={"04465-02220\n04465-12610"}
                    value={oemText}
                    onChange={(e) => setOemText(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </Panel>

          <Panel title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={`Selling price (${currency})`} htmlFor="sellingPrice" required error={errors.sellingPrice?.message}>
                <Input id="sellingPrice" type="number" min={0} inputMode="numeric" {...register("sellingPrice", { valueAsNumber: true })} />
              </FormField>
              <FormField label="Was price (optional)" htmlFor="compareAtPrice">
                <Input
                  id="compareAtPrice"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  {...register("compareAtPrice", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                />
              </FormField>
              <FormField label="Cost price" htmlFor="costPrice" error={errors.costPrice?.message}>
                <Input id="costPrice" type="number" min={0} inputMode="numeric" {...register("costPrice", { valueAsNumber: true })} />
              </FormField>
            </div>
            <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-neutral">
              Margin{" "}
              <b className={cn("tabular-nums", margin > 0 ? "text-success" : "text-danger")}>{margin.toFixed(1)}%</b>
              {" · "}profit per unit <b className="text-ink tabular-nums">{formatPrice(selling - cost, currency)}</b>
            </p>
          </Panel>

          <Panel title="Vehicle fitment" description="Which vehicles does this part fit? Powers the shop's “Find parts for my car”.">
            <FitmentEditor value={fitments} onChange={setFitments} vehicles={vehicles} disabled={isUniversal} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <div className="space-y-4">
              {toggles.map((t) => (
                <label key={t.key} className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={!!watch(t.key)}
                    onCheckedChange={(v) => setValue(t.key, !!v, { shouldDirty: true })}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-ink">{t.label}</span>
                    <span className="block text-neutral">{t.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Inventory">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={isEdit ? "In stock" : "Opening stock"}
                htmlFor="quantity"
                error={errors.quantity?.message}
              >
                <Input
                  id="quantity"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  disabled={isEdit && !canAdjustStock}
                  {...register("quantity", { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Reorder at" htmlFor="restockLevel">
                <Input id="restockLevel" type="number" min={0} inputMode="numeric" {...register("restockLevel", { valueAsNumber: true })} />
              </FormField>
            </div>
            {isEdit && (
              <p className="mt-3 text-xs text-neutral">
                Changing stock here is logged as a manual adjustment. For receipts, damages or stock-takes use{" "}
                <Link href="/admin/inventory" className="font-semibold text-primary">Inventory</Link>.
              </p>
            )}
          </Panel>

          <Panel title="Images">
            <ImageUploader images={images} onChange={setImages} />
          </Panel>

          <Panel title="Categories">
            <CategorySelector
              value={categories}
              onChange={(next) => setValue("categories", next, { shouldValidate: true })}
            />
          </Panel>
        </div>
      </div>

      {/* Mobile sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-surface/90 p-3 backdrop-blur-xl lg:hidden">
        <Button asChild variant="outline" className="flex-1">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" className="flex-1" loading={isPending}>
          {isEdit ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
