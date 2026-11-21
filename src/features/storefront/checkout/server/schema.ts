import { z } from "zod";

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.email("Enter a valid email").max(160),
    phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
    fulfilment: z.enum(["delivery", "pickup"]),
    address: z.string().trim().max(240).optional().or(z.literal("")),
    city: z.string().trim().max(80).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    couponCode: z.string().trim().max(40).optional().or(z.literal("")),
    paymentMethod: z.enum(["paystack", "pay_on_pickup"]),
  })
  .superRefine((d, ctx) => {
    if (d.fulfilment === "delivery") {
      if (!d.address || d.address.length < 4) {
        ctx.addIssue({ code: "custom", path: ["address"], message: "Enter a delivery address" });
      }
      if (!d.city) {
        ctx.addIssue({ code: "custom", path: ["city"], message: "Enter your city" });
      }
      if (d.paymentMethod === "pay_on_pickup") {
        ctx.addIssue({
          code: "custom",
          path: ["paymentMethod"],
          message: "Pay on pickup is only available for store pickup",
        });
      }
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
