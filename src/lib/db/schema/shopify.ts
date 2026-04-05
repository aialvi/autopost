import {
  bigint,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./core";

export const shopifyProducts = pgTable(
  "shopify_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    shopifyProductId: bigint("shopify_product_id", { mode: "number" })
      .notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shopify_product_brand_idx").on(table.brandId),
    unique("shopify_product_brand_id_unique").on(
      table.brandId,
      table.shopifyProductId
    ),
  ]
);

export const shopifyProductsRelations = relations(shopifyProducts, ({
  many,
}) => ({
  variants: many(shopifyVariants),
}));

export const shopifyVariants = pgTable(
  "shopify_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => shopifyProducts.id, { onDelete: "cascade" }),
    shopifyVariantId: bigint("shopify_variant_id", { mode: "number" })
      .notNull(),
    title: text("title").notNull(),
    sku: text("sku"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    costPerItem: decimal("cost_per_item", { precision: 10, scale: 2 }),
    inventoryItemId: bigint("inventory_item_id", { mode: "number" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shopify_variant_product_idx").on(table.productId),
    index("shopify_variant_id_idx").on(table.shopifyVariantId),
  ]
);

export const shopifyVariantsRelations = relations(shopifyVariants, ({
  one,
  many,
}) => ({
  product: one(shopifyProducts, {
    fields: [shopifyVariants.productId],
    references: [shopifyProducts.id],
  }),
  orderItems: many(shopifyOrderItems),
}));

export const shopifyOrders = pgTable(
  "shopify_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    shopifyOrderId: bigint("shopify_order_id", { mode: "number" })
      .notNull(),
    orderNumber: text("order_number").notNull(),
    emailHash: text("email_hash").notNull(),
    subtotalPrice: decimal("subtotal_price", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    totalShipping: decimal("total_shipping", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    totalTax: decimal("total_tax", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    totalDiscounts: decimal("total_discounts", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0.00"),
    paymentGateway: text("payment_gateway"),
    financialStatus: text("financial_status"),
    fulfillmentStatus: text("fulfillment_status"),
    refundAmount: decimal("refund_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    processedAt: timestamp("processed_at", { mode: "date" }),
    cancelledAt: timestamp("cancelled_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shopify_order_brand_idx").on(table.brandId),
    index("shopify_order_id_idx").on(table.shopifyOrderId),
    unique("shopify_order_brand_id_unique").on(
      table.brandId,
      table.shopifyOrderId
    ),
    index("shopify_order_processed_idx").on(table.processedAt),
  ]
);

export const shopifyOrdersRelations = relations(shopifyOrders, ({ one, many }) => ({
  brand: one(brands, {
    fields: [shopifyOrders.brandId],
    references: [brands.id],
  }),
  items: many(shopifyOrderItems),
  transactionFees: many(transactionFees),
}));

export const shopifyOrderItems = pgTable(
  "shopify_order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => shopifyOrders.id, { onDelete: "cascade" }),
    shopifyLineItemId: bigint("shopify_line_item_id", { mode: "number" })
      .notNull(),
    variantId: uuid("variant_id").references(
      () => shopifyVariants.id,
      { onDelete: "set null" }
    ),
    productId: uuid("product_id").references(
      () => shopifyProducts.id,
      { onDelete: "set null" }
    ),
    title: text("title").notNull(),
    quantity: text("quantity").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    costPerItem: decimal("cost_per_item", { precision: 10, scale: 2 }),
    totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shopify_order_item_order_idx").on(table.orderId),
    index("shopify_order_item_variant_idx").on(table.variantId),
  ]
);

export const shopifyOrderItemsRelations = relations(shopifyOrderItems, ({
  one,
}) => ({
  order: one(shopifyOrders, {
    fields: [shopifyOrderItems.orderId],
    references: [shopifyOrders.id],
  }),
  variant: one(shopifyVariants, {
    fields: [shopifyOrderItems.variantId],
    references: [shopifyVariants.id],
  }),
  product: one(shopifyProducts, {
    fields: [shopifyOrderItems.productId],
    references: [shopifyProducts.id],
  }),
}));

export const transactionFees = pgTable(
  "transaction_fees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => shopifyOrders.id, { onDelete: "cascade" }),
    gateway: text("gateway").notNull(),
    feePercentage: decimal("fee_percentage", { precision: 5, scale: 4 })
      .notNull()
      .default("0.0000"),
    feeFixed: decimal("fee_fixed", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    feeAmount: decimal("fee_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("transaction_fee_order_idx").on(table.orderId)]
);

export const transactionFeesRelations = relations(transactionFees, ({
  one,
}) => ({
  order: one(shopifyOrders, {
    fields: [transactionFees.orderId],
    references: [shopifyOrders.id],
  }),
}));
