import { z } from "zod";

export const bookingSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1, "Choose at least one service").max(6),
  vehicle: z.object({
    makeId: z.string().optional().or(z.literal("")),
    modelId: z.string().optional().or(z.literal("")),
    makeName: z.string().trim().min(1, "Enter your vehicle make").max(60),
    modelName: z.string().trim().min(1, "Enter your vehicle model").max(60),
    year: z.number().int().min(1950).max(2100).nullable().optional(),
    plateNumber: z.string().trim().max(20).optional().or(z.literal("")),
    mileage: z.number().int().min(0).max(2_000_000).nullable().optional(),
  }),
  start: z.iso.datetime({ message: "Choose a time slot" }),
  name: z.string().trim().min(2, "Enter your name").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  email: z.email("Enter a valid email").max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BookingInput = z.input<typeof bookingSchema>;
