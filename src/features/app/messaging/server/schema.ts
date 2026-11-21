import { z } from "zod";

export const createMessageSchema = z.object({
  senderName: z.string().trim().min(1, "Required").max(100),
  senderEmail: z.email("Enter a valid email").max(160),
  senderPhone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Tell us a bit more").max(2000),
  /** Honeypot — real users never fill this hidden field. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
