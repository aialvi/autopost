import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Notification preferences per brand/user
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id").notNull(),
    userId: uuid("user_id").notNull(),
    telegramChatId: varchar("telegram_chat_id", { length: 255 }),

    // Enable/disable notifications
    enabled: boolean("enabled").notNull().default(true),

    // Alert types
    alertOnLowRoas: boolean("alert_on_low_roas").notNull().default(true),
    alertOnSpendSpike: boolean("alert_on_spend_spike").notNull().default(true),
    alertOnRevenueDrop: boolean("alert_on_revenue_drop").notNull().default(true),
    alertOnNewOrder: boolean("alert_on_new_order").notNull().default(false),
    alertOnDailySummary: boolean("alert_on_daily_summary").notNull().default(true),
    alertOnWeeklySummary: boolean("alert_on_weekly_summary").notNull().default(true),

    // Thresholds
    lowRoasThreshold: varchar("low_roas_threshold", { length: 10 })
      .notNull()
      .default("1.0"),
    spendSpikeThreshold: varchar("spend_spike_threshold", { length: 10 })
      .notNull()
      .default("50"), // percentage
    revenueDropThreshold: varchar("revenue_drop_threshold", { length: 10 })
      .notNull()
      .default("20"), // percentage

    // Quiet hours (no notifications during this time)
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:MM format
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:MM format
    timezone: text("timezone").notNull().default("UTC"),

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notif_pref_brand_idx").on(table.brandId),
    index("notif_pref_user_idx").on(table.userId),
  ]
);

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({})
);

// Notification log for tracking sent notifications
export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id").notNull(),
    userId: uuid("user_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // low_roas, spend_spike, daily_summary, etc.
    channel: varchar("channel", { length: 50 })
      .notNull()
      .default("telegram"), // telegram, email, etc.
    status: varchar("status", { length: 20 })
      .notNull()
      .default("sent"), // sent, failed, pending

    title: varchar("title", { length: 255 }),
    message: text("message").notNull(),
    data: text("data"), // JSON string with additional context

    sentAt: timestamp("sent_at", { mode: "date" }).notNull().defaultNow(),
    error: text("error"),
  },
  (table) => [
    index("notif_log_brand_idx").on(table.brandId),
    index("notif_log_user_idx").on(table.userId),
    index("notif_log_type_idx").on(table.type),
    index("notif_log_sent_idx").on(table.sentAt),
  ]
);

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  // Add relations if needed
}));
