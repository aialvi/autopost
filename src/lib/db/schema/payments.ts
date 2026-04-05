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
import { brands } from "./core";

// Subscriptions
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),

    // Polar.sh subscription data
    polarSubscriptionId: varchar("polar_subscription_id", { length: 255 }),
    polarProductId: varchar("polar_product_id", { length: 255 }),
    polarCustomerId: varchar("polar_customer_id", { length: 255 }),

    // Subscription details
    status: varchar("status", { length: 50 })
      .notNull()
      .default("active"), // active, canceled, past_due, incomplete, trialing
    tier: varchar("tier", { length: 50 })
      .notNull()
      .default("free"), // free, starter, pro, enterprise

    // Billing period
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    amount: varchar("amount", { length: 20 }).notNull(),

    // Trial
    trialStart: timestamp("trial_start", { mode: "date" }),
    trialEnd: timestamp("trial_end", { mode: "date" }),

    // Period
    currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),

    // Cancellation
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),
    canceledAt: timestamp("canceled_at", { mode: "date" }),

    // Metadata
    metadata: text("metadata"), // JSON string for additional data

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("subscription_brand_idx").on(table.brandId),
    index("subscription_polar_id_idx").on(table.polarSubscriptionId),
    index("subscription_status_idx").on(table.status),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  brand: one(brands, {
    fields: [subscriptions.brandId],
    references: [brands.id],
  }),
}));

// Invoices
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" }
    ),

    // Polar.sh invoice data
    polarInvoiceId: varchar("polar_invoice_id", { length: 255 }).unique(),
    polarInvoiceUrl: text("polar_invoice_url"),

    // Invoice details
    status: varchar("status", { length: 50 })
      .notNull()
      .default("draft"), // draft, open, paid, void, uncollectible
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    subtotal: varchar("subtotal", { length: 20 }).notNull(),
    tax: varchar("tax", { length: 20 }).notNull().default("0"),
    total: varchar("total", { length: 20 }).notNull(),

    // Dates
    dueDate: timestamp("due_date", { mode: "date" }),
    paidAt: timestamp("paid_at", { mode: "date" }),

    // Metadata
    description: text("description"),
    metadata: text("metadata"), // JSON string

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoice_brand_idx").on(table.brandId),
    index("invoice_subscription_idx").on(table.subscriptionId),
    index("invoice_polar_id_idx").on(table.polarInvoiceId),
    index("invoice_status_idx").on(table.status),
  ]
);

export const invoicesRelations = relations(invoices, ({ one }) => ({
  brand: one(brands, {
    fields: [invoices.brandId],
    references: [brands.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// Payment methods
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),

    // Polar.sh payment method data
    polarPaymentMethodId: varchar("polar_payment_method_id", { length: 255 }),

    // Payment method details
    type: varchar("type", { length: 50 })
      .notNull()
      .default("card"), // card, bank_account
    isDefault: boolean("is_default").notNull().default(false),

    // Card details (encrypted/stored by Polar)
    last4: varchar("last4", { length: 4 }),
    brand: varchar("brand", { length: 20 }), // visa, mastercard, etc.
    expiryMonth: varchar("expiry_month", { length: 2 }),
    expiryYear: varchar("expiry_year", { length: 4 }),

    // Status
    status: varchar("status", { length: 50 })
      .notNull()
      .default("active"), // active, inactive

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_method_brand_idx").on(table.brandId),
    index("payment_method_polar_id_idx").on(table.polarPaymentMethodId),
  ]
);

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  brand: one(brands, {
    fields: [paymentMethods.brandId],
    references: [brands.id],
  }),
}));

// Usage records (for metered billing)
export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" }
    ),

    // Usage details
    metric: varchar("metric", { length: 100 }).notNull(), // orders, api_calls, etc.
    quantity: varchar("quantity", { length: 20 }).notNull(),
    unit: varchar("unit", { length: 50 }), // order, call, etc.

    // Period
    periodStart: timestamp("period_start", { mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { mode: "date" }).notNull(),

    // Metadata
    description: text("description"),
    metadata: text("metadata"), // JSON string

    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("usage_record_brand_idx").on(table.brandId),
    index("usage_record_subscription_idx").on(table.subscriptionId),
    index("usage_record_period_idx").on(table.periodStart, table.periodEnd),
    index("usage_record_metric_idx").on(table.metric),
  ]
);

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  brand: one(brands, {
    fields: [usageRecords.brandId],
    references: [brands.id],
  }),
  subscription: one(subscriptions, {
    fields: [usageRecords.subscriptionId],
    references: [subscriptions.id],
  }),
}));
