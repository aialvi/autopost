import {
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./core";

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    platform: text("platform", {
      enum: ["meta", "snapchat", "google", "tiktok"],
    }).notNull(),
    platformCampaignId: text("platform_campaign_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    objective: text("objective"),
    dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }),
    lifetimeBudget: decimal("lifetime_budget", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_campaign_brand_idx").on(table.brandId),
    index("ad_campaign_platform_idx").on(table.platform),
    unique("ad_campaign_brand_platform_id_unique").on(
      table.brandId,
      table.platform,
      table.platformCampaignId
    ),
  ]
);

export const adCampaignsRelations = relations(adCampaigns, ({ one, many }) => ({
  brand: one(brands, {
    fields: [adCampaigns.brandId],
    references: [brands.id],
  }),
  adSets: many(adSets),
  adDataSnapshots: many(adDataSnapshots),
}));

export const adSets = pgTable(
  "ad_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    platformAdsetId: text("platform_adset_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_set_campaign_idx").on(table.campaignId),
    index("ad_set_platform_id_idx").on(table.platformAdsetId),
  ]
);

export const adSetsRelations = relations(adSets, ({ one, many }) => ({
  campaign: one(adCampaigns, {
    fields: [adSets.campaignId],
    references: [adCampaigns.id],
  }),
  ads: many(ads),
}));

export const ads = pgTable(
  "ads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id").references(() => adCampaigns.id, { onDelete: "set null" }),
    adsetId: uuid("adset_id").references(() => adSets.id, { onDelete: "set null" }),
    platformAdId: text("platform_ad_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    creativeUrl: text("creative_url"),
    creativeThumbnail: text("creative_thumbnail"),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_campaign_idx").on(table.campaignId),
    index("ad_adset_idx").on(table.adsetId),
    index("ad_platform_id_idx").on(table.platformAdId),
  ]
);

export const adsRelations = relations(ads, ({ one, many }) => ({
  adSet: one(adSets, {
    fields: [ads.adsetId],
    references: [adSets.id],
  }),
  adDataSnapshots: many(adDataSnapshots),
}));

export const adDataSnapshots = pgTable(
  "ad_data_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    platform: text("platform", {
      enum: ["meta", "snapchat", "google", "tiktok"],
    }).notNull(),
    campaignId: uuid("campaign_id").references(
      () => adCampaigns.id,
      { onDelete: "set null" }
    ),
    adsetId: uuid("adset_id").references(() => adSets.id, {
      onDelete: "set null",
    }),
    adId: uuid("ad_id").references(() => ads.id, { onDelete: "set null" }),
    date: text("date") // Stored as YYYY-MM-DD string for proper partitioning
      .notNull(),
    spend: decimal("spend", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    revenueReported: decimal("revenue_reported", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0.00"),
    cpm: decimal("cpm", { precision: 10, scale: 2 }),
    cpc: decimal("cpc", { precision: 10, scale: 2 }),
    ctr: decimal("ctr", { precision: 5, scale: 4 }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_snapshot_brand_idx").on(table.brandId),
    index("ad_snapshot_platform_idx").on(table.platform),
    index("ad_snapshot_ad_idx").on(table.adId),
    index("ad_snapshot_date_idx").on(table.date),
    unique("ad_snapshot_brand_platform_ad_date_unique").on(
      table.brandId,
      table.platform,
      table.adId,
      table.date
    ),
  ]
);

export const adDataSnapshotsRelations = relations(adDataSnapshots, ({
  one,
}) => ({
  brand: one(brands, {
    fields: [adDataSnapshots.brandId],
    references: [brands.id],
  }),
  campaign: one(adCampaigns, {
    fields: [adDataSnapshots.campaignId],
    references: [adCampaigns.id],
  }),
  adSet: one(adSets, {
    fields: [adDataSnapshots.adsetId],
    references: [adSets.id],
  }),
  ad: one(ads, {
    fields: [adDataSnapshots.adId],
    references: [ads.id],
  }),
}));
