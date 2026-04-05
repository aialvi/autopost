import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./core";

export const pixelEvents = pgTable(
  "pixel_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventId: text("event_id").notNull(),
    sessionId: text("session_id").notNull(),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    referrer: text("referrer"),
    pageUrl: text("page_url").notNull(),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    eventData: jsonb("event_data").$type<{
      value?: number;
      currency?: string;
      contentIds?: string[];
      contentType?: string;
      orderId?: string;
    }>(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pixel_event_brand_idx").on(table.brandId),
    index("pixel_event_type_idx").on(table.eventType),
    index("pixel_event_session_idx").on(table.sessionId),
    index("pixel_event_created_idx").on(table.createdAt),
  ]
);

export const pixelEventsRelations = relations(pixelEvents, ({ one }) => ({
  brand: one(brands, {
    fields: [pixelEvents.brandId],
    references: [brands.id],
  }),
}));

export const capiEvents = pgTable(
  "capi_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    platform: text("platform", {
      enum: ["meta", "snapchat", "google", "tiktok"],
    }).notNull(),
    eventName: text("event_name").notNull(),
    eventId: text("event_id").notNull(),
    eventData: jsonb("event_data").notNull(),
    sentAt: timestamp("sent_at", { mode: "date" }).notNull(),
    responseStatus: text("response_status"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("capi_event_brand_idx").on(table.brandId),
    index("capi_event_platform_idx").on(table.platform),
    index("capi_event_name_idx").on(table.eventName),
    index("capi_event_created_idx").on(table.createdAt),
  ]
);

export const capiEventsRelations = relations(capiEvents, ({ one }) => ({
  brand: one(brands, {
    fields: [capiEvents.brandId],
    references: [brands.id],
  }),
}));
