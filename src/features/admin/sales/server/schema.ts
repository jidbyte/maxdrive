import { z } from "zod";

import { SALE_STATUSES } from "@/shared/db/schema/sales";

export const saleItemSchema = z.object({
  productId: z.string().optional().or(z.literal("")),
  productName: z.string().min(1, "Required").max(120),
  productCode: z.string().max(64).optional().or(z.literal("")),
  productSku: z.string().min(1, "Required").max(64),
  quantity: z.number().int().min(1, "Must be at least 1"),
  unitPrice: z.number().int().min(0, "Must be 0 or more"),
});

export const CREATE_SALE_PAYMENT_STATUSES = [
  "pending",
  "partial",
  "paid",
  "overdue",
] as const;

export const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "card",
  "bank_transfer",
  "paystack",
  "other",
] as const;

export const createSaleSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  customerName: z.string().min(1, "Required").max(120),
  customerPhone: z.string().max(30).optional().or(z.literal("")),
  saleDate: z.string().min(1, "Required"),
  paymentStatus: z.enum(CREATE_SALE_PAYMENT_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  balance: z.number().int().min(0),
  discountAmount: z.number().int().min(0),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z.array(saleItemSchema).min(1, "Add at least one item"),
});

export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type CreateSaleInput = z.input<typeof createSaleSchema>;

// Header-only edit — items are locked after creation (stock already moved).
export const updateSaleSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  customerName: z.string().min(1, "Required").max(120),
  saleDate: z.string().min(1, "Required"),
  discountAmount: z.number().int().min(0),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;

export const PAYMENT_STATUSES = [
  "pending",
  "partial",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const saleStatusSchema = z.enum(SALE_STATUSES);
export type SaleStatus = z.infer<typeof saleStatusSchema>;
