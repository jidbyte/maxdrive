import { z } from "zod";

export const productImageSchema = z.object({
  url: z.string().url(),
  fileKey: z.string().min(1),
  isPrimary: z.boolean(),
});

export const fitmentSchema = z.object({
  makeId: z.string().min(1),
  modelId: z.string().optional().or(z.literal("")),
  yearFrom: z.number().int().min(1950).max(2100).optional().nullable(),
  yearTo: z.number().int().min(1950).max(2100).optional().nullable(),
  engine: z.string().max(60).optional().or(z.literal("")),
  notes: z.string().max(200).optional().or(z.literal("")),
});

// Prices are whole currency units (matching the integer columns).
export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Required").max(120),
  sku: z.string().trim().min(1, "Required").max(64),
  partNumber: z.string().trim().max(64).optional().or(z.literal("")),
  /** Comma/newline separated in the form; normalised to an array server-side. */
  oemNumbers: z.array(z.string().trim().max(64)).max(30).default([]),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  model: z.string().trim().max(80).optional().or(z.literal("")),
  description: z
    .string()
    .max(2000, "Must not exceed 2000 characters")
    .optional()
    .or(z.literal("")),
  condition: z.enum(["new", "used", "refurbished"]).default("new"),
  warrantyMonths: z.number().int().min(0).max(120).optional().nullable(),
  sellingPrice: z.number().int().min(0, "Must be 0 or more"),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  costPrice: z.number().int().min(0, "Must be 0 or more"),
  quantity: z.number().int().min(0, "Must be 0 or more"),
  restockLevel: z.number().int().min(0, "Must be 0 or more"),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isUniversal: z.boolean().default(false),
  categories: z.array(z.string()).max(10),
  images: z.array(productImageSchema).max(8),
  fitments: z.array(fitmentSchema).max(100).default([]),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductOutput = z.output<typeof createProductSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
export type FitmentInput = z.infer<typeof fitmentSchema>;

export const adjustStockSchema = z.object({
  productId: z.string().min(1),
  delta: z.number().int().refine((n) => n !== 0, "Enter a non-zero amount"),
  reason: z.enum(["adjustment", "stock_take", "damaged", "returned"]),
  note: z.string().max(200).optional().or(z.literal("")),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
