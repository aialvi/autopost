import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./core";

export const syncLogs = pgTable(
  "platform_sync_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    syncType: text("sync_type", {
      enum: ["ad_data", "orders", "products", "token_refresh"],
    }).notNull(),
    status: text("status", {
      enum: ["started", "success", "failed", "partial"],
    }).notNull(),
    recordsProcessed: integer("records_processed").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (table) => [
    index("sync_log_brand_idx").on(table.brandId),
    index("sync_log_platform_idx").on(table.platform),
    index("sync_log_status_idx").on(table.status),
    index("sync_log_started_idx").on(table.startedAt),
  ]
);

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  brand: one(brands, {
    fields: [syncLogs.brandId],
    references: [brands.id],
  }),
}));

export const telegramConfigs = pgTable(
  "telegram_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull(),
    botToken: text("bot_token").notNull(),
    reportTime: text("report_time").notNull().default("09:00"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("telegram_config_brand_idx").on(table.brandId),
  ]
);

export const telegramConfigsRelations = relations(telegramConfigs, ({
  one,
}) => ({
  brand: one(brands, {
    fields: [telegramConfigs.brandId],
    references: [brands.id],
  }),
}));
