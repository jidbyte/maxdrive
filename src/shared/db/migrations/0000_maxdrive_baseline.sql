CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"name" text DEFAULT 'MAXDRIVE' NOT NULL,
	"legal_name" text,
	"tagline" text,
	"description" text,
	"logo_url" text,
	"email" text,
	"phone" text,
	"whatsapp_phone" text,
	"address" text,
	"city" text,
	"country" text DEFAULT 'GH' NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"tax_inclusive" boolean DEFAULT true NOT NULL,
	"delivery_enabled" boolean DEFAULT true NOT NULL,
	"pickup_enabled" boolean DEFAULT true NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"free_delivery_threshold" integer,
	"opening_hours" jsonb DEFAULT '[{"day":0,"open":"10:00","close":"16:00","closed":true},{"day":1,"open":"08:00","close":"18:00","closed":false},{"day":2,"open":"08:00","close":"18:00","closed":false},{"day":3,"open":"08:00","close":"18:00","closed":false},{"day":4,"open":"08:00","close":"18:00","closed":false},{"day":5,"open":"08:00","close":"18:00","closed":false},{"day":6,"open":"09:00","close":"15:00","closed":false}]'::jsonb NOT NULL,
	"booking_slot_minutes" integer DEFAULT 30 NOT NULL,
	"workshop_bays" integer DEFAULT 2 NOT NULL,
	"low_stock_threshold" integer DEFAULT 10 NOT NULL,
	"email_notifications_enabled" boolean DEFAULT true NOT NULL,
	"whatsapp_notifications_enabled" boolean DEFAULT true NOT NULL,
	"order_alert_email" text,
	"socials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_singleton" CHECK ("store_settings"."id" = 'default')
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_uid" text NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"photo_url" text,
	"last_sign_in_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_auth_uid_unique" UNIQUE("auth_uid")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_uid" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role_id" text NOT NULL,
	"token" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	CONSTRAINT "role_permission_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "staff_member" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"job_title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_member_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name"),
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "image" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"file_key" text NOT NULL,
	"product_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"alt" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_log" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"delta" integer NOT NULL,
	"balance_after" integer,
	"reason" text NOT NULL,
	"note" text,
	"reference_type" text,
	"reference_id" text,
	"actor_uid" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"code" text,
	"part_number" text,
	"oem_numbers" text[] DEFAULT '{}'::text[] NOT NULL,
	"brand" text,
	"model" text,
	"description" text,
	"condition" text DEFAULT 'new' NOT NULL,
	"warranty_months" integer,
	"weight_grams" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"restock_level" integer DEFAULT 10 NOT NULL,
	"cost_price" integer DEFAULT 0 NOT NULL,
	"selling_price" integer DEFAULT 0 NOT NULL,
	"compare_at_price" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_universal" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "product_category" (
	"product_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_category_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "customer_vehicle" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"make_id" text,
	"model_id" text,
	"make_name" text NOT NULL,
	"model_name" text NOT NULL,
	"year" integer,
	"engine" text,
	"vin" text,
	"plate_number" text,
	"mileage" integer,
	"nickname" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_fitment" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"make_id" text NOT NULL,
	"model_id" text,
	"year_from" integer,
	"year_to" integer,
	"engine" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_make" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_make_name_unique" UNIQUE("name"),
	CONSTRAINT "vehicle_make_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_model" (
	"id" text PRIMARY KEY NOT NULL,
	"make_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicleModel_make_slug_unique" UNIQUE("make_id","slug")
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"website" text,
	"address" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_number" text NOT NULL,
	"supplier_id" text,
	"supplier_name" text NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"eta" timestamp,
	"delivery_date" timestamp,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"purchase_status" text DEFAULT 'draft' NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_purchase_number_unique" UNIQUE("purchase_number")
);
--> statement-breakpoint
CREATE TABLE "purchase_item" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_code" text,
	"product_sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_uid" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"customer_type" text DEFAULT 'individual' NOT NULL,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_buyer_uid_unique" UNIQUE("buyer_uid")
);
--> statement-breakpoint
CREATE TABLE "sale" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_number" text NOT NULL,
	"channel" text DEFAULT 'walk_in' NOT NULL,
	"fulfilment" text DEFAULT 'pickup' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"customer_id" text,
	"buyer_uid" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"delivery_address" text,
	"delivery_city" text,
	"sale_date" timestamp NOT NULL,
	"paystack_reference" text,
	"coupon_id" text,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"paid_at" timestamp,
	"access_token" text NOT NULL,
	"stock_committed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sale_sale_number_unique" UNIQUE("sale_number"),
	CONSTRAINT "sale_paystack_reference_unique" UNIQUE("paystack_reference")
);
--> statement-breakpoint
CREATE TABLE "sale_item" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_code" text,
	"product_sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"subtotal" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_uid" text,
	"guest_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cart_buyer_uid_unique" UNIQUE("buyer_uid"),
	CONSTRAINT "cart_guest_id_unique" UNIQUE("guest_id")
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cartItem_cart_product_unique" UNIQUE("cart_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sale_item_id" text NOT NULL,
	"buyer_uid" text NOT NULL,
	"buyer_name" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_product_buyer_unique" UNIQUE("product_id","buyer_uid")
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"expense_date" timestamp NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"description" text,
	"amount" integer NOT NULL,
	"income_date" timestamp NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"sale_id" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"pdf_file_key" text,
	"pdf_url" text,
	"sent_via_email" timestamp,
	"sent_via_whatsapp" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_item" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_type" text DEFAULT 'percentage' NOT NULL,
	"discount_value" integer NOT NULL,
	"min_order_amount" integer DEFAULT 0 NOT NULL,
	"max_redemptions" integer,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_name" text NOT NULL,
	"sender_email" text NOT NULL,
	"sender_phone" text,
	"subject" text,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"emailed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text,
	"summary" text,
	"description" text,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"base_price" integer DEFAULT 0 NOT NULL,
	"price_is_from" boolean DEFAULT false NOT NULL,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service_booking" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_number" text NOT NULL,
	"customer_id" text,
	"buyer_uid" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text NOT NULL,
	"vehicle_id" text,
	"vehicle_description" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"source" text DEFAULT 'online' NOT NULL,
	"estimated_total" integer DEFAULT 0 NOT NULL,
	"customer_notes" text,
	"internal_notes" text,
	"access_token" text NOT NULL,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_booking_booking_number_unique" UNIQUE("booking_number")
);
--> statement-breakpoint
CREATE TABLE "service_booking_item" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"service_id" text,
	"service_name" text NOT NULL,
	"price" integer NOT NULL,
	"duration_minutes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order" (
	"id" text PRIMARY KEY NOT NULL,
	"work_order_number" text NOT NULL,
	"booking_id" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"vehicle_id" text,
	"vehicle_description" text NOT NULL,
	"mileage_in" integer,
	"technician_user_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"complaint" text,
	"diagnosis" text,
	"labour_total" integer DEFAULT 0 NOT NULL,
	"parts_total" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"sale_id" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_order_work_order_number_unique" UNIQUE("work_order_number")
);
--> statement-breakpoint
CREATE TABLE "work_order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"work_order_id" text NOT NULL,
	"type" text NOT NULL,
	"product_id" text,
	"service_id" text,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_user_id_app_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_member" ADD CONSTRAINT "staff_member_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_member" ADD CONSTRAINT "staff_member_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_vehicle" ADD CONSTRAINT "customer_vehicle_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_vehicle" ADD CONSTRAINT "customer_vehicle_make_id_vehicle_make_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_make"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_vehicle" ADD CONSTRAINT "customer_vehicle_model_id_vehicle_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_model"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitment" ADD CONSTRAINT "product_fitment_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitment" ADD CONSTRAINT "product_fitment_make_id_vehicle_make_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_make"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitment" ADD CONSTRAINT "product_fitment_model_id_vehicle_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_model"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_make_id_vehicle_make_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."vehicle_make"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_purchase_id_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_coupon_id_coupon_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupon"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_sale_item_id_sale_item_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_booking" ADD CONSTRAINT "service_booking_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_booking" ADD CONSTRAINT "service_booking_vehicle_id_customer_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."customer_vehicle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_booking_item" ADD CONSTRAINT "service_booking_item_booking_id_service_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_booking_item" ADD CONSTRAINT "service_booking_item_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_booking_id_service_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_booking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_vehicle_id_customer_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."customer_vehicle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_technician_user_id_app_user_id_fk" FOREIGN KEY ("technician_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_item" ADD CONSTRAINT "work_order_item_work_order_id_work_order_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_item" ADD CONSTRAINT "work_order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_item" ADD CONSTRAINT "work_order_item_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appUser_authUid_idx" ON "app_user" USING btree ("auth_uid");--> statement-breakpoint
CREATE INDEX "appUser_email_idx" ON "app_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auditLog_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "auditLog_createdAt_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_token_idx" ON "invitation" USING btree ("token");--> statement-breakpoint
CREATE INDEX "rolePermission_roleId_idx" ON "role_permission" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "staffMember_roleId_idx" ON "staff_member" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "category_name_idx" ON "category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "image_productId_idx" ON "image" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "image_isPrimary_idx" ON "image" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "inventoryLog_productId_idx" ON "inventory_log" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventoryLog_createdAt_idx" ON "inventory_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_name_idx" ON "product" USING btree ("name");--> statement-breakpoint
CREATE INDEX "product_sku_idx" ON "product" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_partNumber_idx" ON "product" USING btree ("part_number");--> statement-breakpoint
CREATE INDEX "product_brand_idx" ON "product" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "product_isActive_idx" ON "product" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "product_isFeatured_idx" ON "product" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "productCategory_productId_idx" ON "product_category" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "productCategory_categoryId_idx" ON "product_category" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "customerVehicle_customerId_idx" ON "customer_vehicle" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customerVehicle_plate_idx" ON "customer_vehicle" USING btree ("plate_number");--> statement-breakpoint
CREATE INDEX "productFitment_productId_idx" ON "product_fitment" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "productFitment_lookup_idx" ON "product_fitment" USING btree ("make_id","model_id");--> statement-breakpoint
CREATE INDEX "vehicleModel_makeId_idx" ON "vehicle_model" USING btree ("make_id");--> statement-breakpoint
CREATE INDEX "supplier_companyName_idx" ON "supplier" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "supplier_email_idx" ON "supplier" USING btree ("email");--> statement-breakpoint
CREATE INDEX "purchase_supplierId_idx" ON "purchase" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_purchaseDate_idx" ON "purchase" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "purchase_paymentStatus_idx" ON "purchase" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "purchase_purchaseStatus_idx" ON "purchase" USING btree ("purchase_status");--> statement-breakpoint
CREATE INDEX "purchaseItem_purchaseId_idx" ON "purchase_item" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchaseItem_productId_idx" ON "purchase_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "customer" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customer_email_idx" ON "customer" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customer" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "sale_customerId_idx" ON "sale" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sale_buyerUid_idx" ON "sale" USING btree ("buyer_uid");--> statement-breakpoint
CREATE INDEX "sale_saleDate_idx" ON "sale" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "sale_status_idx" ON "sale" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sale_paymentStatus_idx" ON "sale" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "sale_channel_idx" ON "sale" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "saleItem_saleId_idx" ON "sale_item" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "saleItem_productId_idx" ON "sale_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "cart_updatedAt_idx" ON "cart" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "cartItem_cartId_idx" ON "cart_item" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "review_productId_idx" ON "review" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "expense_expenseDate_idx" ON "expense" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "expense_category_idx" ON "expense" USING btree ("category");--> statement-breakpoint
CREATE INDEX "income_incomeDate_idx" ON "income" USING btree ("income_date");--> statement-breakpoint
CREATE INDEX "invoice_customerId_idx" ON "invoice" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoice" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoiceItem_invoiceId_idx" ON "invoice_item" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "coupon_isActive_idx" ON "coupon" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "message_isRead_idx" ON "message" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "service_isActive_idx" ON "service" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "serviceBooking_scheduledAt_idx" ON "service_booking" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "serviceBooking_status_idx" ON "service_booking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "serviceBooking_customerId_idx" ON "service_booking" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "serviceBooking_buyerUid_idx" ON "service_booking" USING btree ("buyer_uid");--> statement-breakpoint
CREATE INDEX "serviceBookingItem_bookingId_idx" ON "service_booking_item" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "workOrder_status_idx" ON "work_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workOrder_technician_idx" ON "work_order" USING btree ("technician_user_id");--> statement-breakpoint
CREATE INDEX "workOrder_customerId_idx" ON "work_order" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "workOrderItem_workOrderId_idx" ON "work_order_item" USING btree ("work_order_id");