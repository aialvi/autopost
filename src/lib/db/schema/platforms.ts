import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./core";

export const platformConnections = pgTable(
  "platform_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    platform: text("platform", {
      enum: ["shopify", "meta", "snapchat", "google", "tiktok"],
    }).notNull(),
    accountId: text("account_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { mode: "date" }),
    scopes: text("scopes"),
    metadata: jsonb("metadata").$type<{
      apiDomain?: string;
      myshopifyDomain?: string;
      webhookSecret?: string;
      businessAccountId?: string;
      adAccountId?: string;
      clientId?: string;
      clientSecret?: string;
      developerToken?: string;
      customerId?: string;
      appId?: string;
      appSecret?: string;
    }>(),
    status: text("status", {
      enum: ["active", "expired", "error"],
    }).notNull()
      .default("active"),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("platform_connection_brand_idx").on(table.brandId),
    index("platform_connection_platform_idx").on(table.platform),
    unique("platform_brand_unique").on(table.brandId, table.platform),
  ]
);

export const platformConnectionsRelations = relations(
  platformConnections,
  ({ one }) => ({
    brand: one(brands, {
      fields: [platformConnections.brandId],
      references: [brands.id],
    }),
  })
);
