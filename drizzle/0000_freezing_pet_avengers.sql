CREATE TABLE "ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"platform_campaign_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"objective" text,
	"daily_budget" numeric(10, 2),
	"lifetime_budget" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ad_campaign_brand_platform_id_unique" UNIQUE("brand_id","platform","platform_campaign_id")
);
--> statement-breakpoint
CREATE TABLE "ad_data_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"campaign_id" uuid,
	"adset_id" uuid,
	"ad_id" uuid,
	"date" text NOT NULL,
	"spend" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"revenue_reported" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"cpm" numeric(10, 2),
	"cpc" numeric(10, 2),
	"ctr" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ad_snapshot_brand_platform_ad_date_unique" UNIQUE("brand_id","platform","ad_id","date")
);
--> statement-breakpoint
CREATE TABLE "ad_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"platform_adset_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adset_id" uuid NOT NULL,
	"platform_ad_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"creative_url" text,
	"creative_thumbnail" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"analysis_type" text NOT NULL,
	"model_used" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"token_usage" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"ad_id" uuid,
	"campaign_id" uuid,
	"action_type" text NOT NULL,
	"current_metrics" jsonb,
	"recommended_changes" jsonb,
	"reasoning" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"executed_at" timestamp,
	"execution_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capi_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"event_name" text NOT NULL,
	"event_id" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"sent_at" timestamp NOT NULL,
	"response_status" text,
	"response_body" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pixel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_id" text NOT NULL,
	"session_id" text NOT NULL,
	"user_agent" text,
	"ip_hash" text,
	"referrer" text,
	"page_url" text NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"event_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expires_at" timestamp,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_users" (
	"brand_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"default_cogs_percentage" varchar(10) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"name" text,
	"image" text,
	"role" text DEFAULT 'operator' NOT NULL,
	"email_verified" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "custom_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"frequency" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"scopes" text,
	"metadata" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_brand_unique" UNIQUE("brand_id","platform")
);
--> statement-breakpoint
CREATE TABLE "shopify_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"shopify_line_item_id" bigint NOT NULL,
	"variant_id" uuid,
	"product_id" uuid,
	"title" text NOT NULL,
	"quantity" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cost_per_item" numeric(10, 2),
	"total_cost" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"shopify_order_id" bigint NOT NULL,
	"order_number" text NOT NULL,
	"email_hash" text NOT NULL,
	"subtotal_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_shipping" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_tax" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_discounts" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"payment_gateway" text,
	"financial_status" text,
	"fulfillment_status" text,
	"refund_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"processed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shopify_order_brand_id_unique" UNIQUE("brand_id","shopify_order_id")
);
--> statement-breakpoint
CREATE TABLE "shopify_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"shopify_product_id" bigint NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shopify_product_brand_id_unique" UNIQUE("brand_id","shopify_product_id")
);
--> statement-breakpoint
CREATE TABLE "shopify_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"shopify_variant_id" bigint NOT NULL,
	"title" text NOT NULL,
	"sku" text,
	"price" numeric(10, 2) NOT NULL,
	"cost_per_item" numeric(10, 2),
	"inventory_item_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"gateway" text NOT NULL,
	"fee_percentage" numeric(5, 4) DEFAULT '0.0000' NOT NULL,
	"fee_fixed" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"fee_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"sync_type" text NOT NULL,
	"status" text NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "telegram_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"chat_id" text NOT NULL,
	"bot_token" text NOT NULL,
	"report_time" text DEFAULT '09:00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_data_snapshots" ADD CONSTRAINT "ad_data_snapshots_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_data_snapshots" ADD CONSTRAINT "ad_data_snapshots_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_data_snapshots" ADD CONSTRAINT "ad_data_snapshots_adset_id_ad_sets_id_fk" FOREIGN KEY ("adset_id") REFERENCES "public"."ad_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_data_snapshots" ADD CONSTRAINT "ad_data_snapshots_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_sets" ADD CONSTRAINT "ad_sets_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_adset_id_ad_sets_id_fk" FOREIGN KEY ("adset_id") REFERENCES "public"."ad_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_analysis_id_ai_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."ai_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capi_events" ADD CONSTRAINT "capi_events_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pixel_events" ADD CONSTRAINT "pixel_events_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_users" ADD CONSTRAINT "brand_users_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_users" ADD CONSTRAINT "brand_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_expenses" ADD CONSTRAINT "custom_expenses_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_order_items" ADD CONSTRAINT "shopify_order_items_order_id_shopify_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shopify_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_order_items" ADD CONSTRAINT "shopify_order_items_variant_id_shopify_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."shopify_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_order_items" ADD CONSTRAINT "shopify_order_items_product_id_shopify_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_orders" ADD CONSTRAINT "shopify_orders_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_products" ADD CONSTRAINT "shopify_products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_variants" ADD CONSTRAINT "shopify_variants_product_id_shopify_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_fees" ADD CONSTRAINT "transaction_fees_order_id_shopify_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shopify_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_sync_logs" ADD CONSTRAINT "platform_sync_logs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_configs" ADD CONSTRAINT "telegram_configs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_campaign_brand_idx" ON "ad_campaigns" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "ad_campaign_platform_idx" ON "ad_campaigns" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "ad_snapshot_brand_idx" ON "ad_data_snapshots" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "ad_snapshot_platform_idx" ON "ad_data_snapshots" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "ad_snapshot_ad_idx" ON "ad_data_snapshots" USING btree ("ad_id");--> statement-breakpoint
CREATE INDEX "ad_snapshot_date_idx" ON "ad_data_snapshots" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ad_set_campaign_idx" ON "ad_sets" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_set_platform_id_idx" ON "ad_sets" USING btree ("platform_adset_id");--> statement-breakpoint
CREATE INDEX "ad_adset_idx" ON "ads" USING btree ("adset_id");--> statement-breakpoint
CREATE INDEX "ad_platform_id_idx" ON "ads" USING btree ("platform_ad_id");--> statement-breakpoint
CREATE INDEX "ai_analysis_brand_idx" ON "ai_analyses" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "ai_analysis_type_idx" ON "ai_analyses" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX "ai_recommendation_analysis_idx" ON "ai_recommendations" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "ai_recommendation_brand_idx" ON "ai_recommendations" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "ai_recommendation_ad_idx" ON "ai_recommendations" USING btree ("ad_id");--> statement-breakpoint
CREATE INDEX "ai_recommendation_status_idx" ON "ai_recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "capi_event_brand_idx" ON "capi_events" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "capi_event_platform_idx" ON "capi_events" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "capi_event_name_idx" ON "capi_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "capi_event_created_idx" ON "capi_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pixel_event_brand_idx" ON "pixel_events" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "pixel_event_type_idx" ON "pixel_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "pixel_event_session_idx" ON "pixel_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "pixel_event_created_idx" ON "pixel_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "accounts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "brand_user_brand_idx" ON "brand_users" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_user_user_idx" ON "brand_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brand_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "custom_expense_brand_idx" ON "custom_expenses" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "platform_connection_brand_idx" ON "platform_connections" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "platform_connection_platform_idx" ON "platform_connections" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "shopify_order_item_order_idx" ON "shopify_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "shopify_order_item_variant_idx" ON "shopify_order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "shopify_order_brand_idx" ON "shopify_orders" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "shopify_order_id_idx" ON "shopify_orders" USING btree ("shopify_order_id");--> statement-breakpoint
CREATE INDEX "shopify_order_processed_idx" ON "shopify_orders" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "shopify_product_brand_idx" ON "shopify_products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "shopify_variant_product_idx" ON "shopify_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "shopify_variant_id_idx" ON "shopify_variants" USING btree ("shopify_variant_id");--> statement-breakpoint
CREATE INDEX "transaction_fee_order_idx" ON "transaction_fees" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sync_log_brand_idx" ON "platform_sync_logs" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "sync_log_platform_idx" ON "platform_sync_logs" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "sync_log_status_idx" ON "platform_sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_log_started_idx" ON "platform_sync_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "telegram_config_brand_idx" ON "telegram_configs" USING btree ("brand_id");