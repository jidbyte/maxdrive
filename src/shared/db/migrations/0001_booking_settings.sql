ALTER TABLE "store_settings" ADD COLUMN "timezone" text DEFAULT 'Africa/Accra' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "booking_window_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "booking_lead_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "online_booking_enabled" boolean DEFAULT true NOT NULL;