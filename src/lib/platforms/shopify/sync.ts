import { persistShopifyOrder } from "./order";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  shopifyProducts,
  shopifyVariants,
  syncLogs,
} from "@/lib/db/schema";
import { ShopifyClient } from "./client";
import { eq, and } from "drizzle-orm";

interface SyncProductsResult {
  created: number;
  updated: number;
  errors: number;
}

interface SyncOrdersResult {
  created: number;
  updated: number;
  errors: number;
}

function bigintToNumber(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

export async function syncShopifyProducts(
  brandId: string,
  storeDomain: string,
  accessToken: string
): Promise<SyncProductsResult> {
  const client = new ShopifyClient({ storeDomain, accessToken });
  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    const products = await client.getProducts({ limit: 250 });
    for (const product of products) {
      const inventoryIds = product.variants.map((variant) => variant.inventory_item_id).filter(Boolean);
      if (inventoryIds.length) {
        const inventory = await client.getInventoryItems(inventoryIds);
        const costs = new Map(inventory.map((item) => [String(item.id), item.cost]));
        for (const variant of product.variants) variant.inventory_item = { cost: costs.get(String(variant.inventory_item_id)) ?? null };
      }
    }

    for (const product of products) {
      try {
        // Check if product exists
        const existing = await db.query.shopifyProducts.findFirst({
          where: and(
            eq(shopifyProducts.brandId, brandId),
            eq(shopifyProducts.shopifyProductId, bigintToNumber(product.id))
          ),
        });

        if (existing) {
          // Update existing product
          await db
            .update(shopifyProducts)
            .set({
              title: product.title,
              status: product.status,
              updatedAt: new Date(),
            })
            .where(eq(shopifyProducts.id, existing.id));
          updated++;

          // Update variants
          for (const variant of product.variants) {
            const existingVariant = await db.query.shopifyVariants.findFirst({
              where: and(eq(shopifyVariants.productId, existing.id), eq(shopifyVariants.shopifyVariantId, bigintToNumber(variant.id))),
            });

            if (existingVariant) {
              await db
                .update(shopifyVariants)
                .set({
                  title: variant.title,
                  sku: variant.sku,
                  price: variant.price,
                  costPerItem: variant.inventory_item?.cost || null,
                  updatedAt: new Date(),
                })
                .where(eq(shopifyVariants.id, existingVariant.id));
            } else {
              await db.insert(shopifyVariants).values({
                productId: existing.id,
                shopifyVariantId: bigintToNumber(variant.id),
                title: variant.title,
                sku: variant.sku,
                price: variant.price,
                costPerItem: variant.inventory_item?.cost || null,
                inventoryItemId: bigintToNumber(variant.inventory_item_id),
              });
            }
          }
        } else {
          // Create new product
          const [newProduct] = await db
            .insert(shopifyProducts)
            .values({
              brandId,
              shopifyProductId: bigintToNumber(product.id),
              title: product.title,
              status: product.status,
            })
            .returning();
          created++;

          // Sync variants
          for (const variant of product.variants) {
            await db.insert(shopifyVariants).values({
              productId: newProduct.id,
              shopifyVariantId: bigintToNumber(variant.id),
              title: variant.title,
              sku: variant.sku,
              price: variant.price,
              costPerItem: variant.inventory_item?.cost || null,
              inventoryItemId: bigintToNumber(variant.inventory_item_id),
            });
          }
        }
      } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error);
        errors++;
      }
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }

  return { created, updated, errors };
}

export async function syncShopifyOrders(
  brandId: string,
  storeDomain: string,
  accessToken: string,
  params?: { processed_at_min?: string }
): Promise<SyncOrdersResult> {
  const client = new ShopifyClient({ storeDomain, accessToken });
  let created = 0;
  let updated = 0;
  let errors = 0;

  try {
    const orders = await client.getOrders({
      limit: 250,
      status: "any",
      processed_at_min: params?.processed_at_min,
    });

    for (const order of orders) {
      try {
        const result = await persistShopifyOrder(brandId, order);
        if (result.created) created++; else updated++;
      } catch (error) { errors++; console.error("Order sync failed", String(order.id), error instanceof Error ? error.message : "Unknown error"); }
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }

  return { created, updated, errors };
}

export async function logSync(
  brandId: string,
  platform: string,
  syncType: "ad_data" | "orders" | "products" | "token_refresh",
  status: "started" | "success" | "failed" | "partial",
  recordsProcessed: number,
  errorMessage?: string
) {
  const logId = crypto.randomUUID();

  await db.insert(syncLogs).values({
    id: logId,
    brandId,
    platform,
    syncType,
    status,
    recordsProcessed,
    errorMessage,
    startedAt: new Date(),
    completedAt: status !== "started" ? new Date() : null,
  });

  return logId;
}

export async function updateSyncLog(
  logId: string,
  status: "success" | "failed" | "partial",
  recordsProcessed: number,
  errorMessage?: string
) {
  await db
    .update(syncLogs)
    .set({
      status,
      recordsProcessed,
      errorMessage,
      completedAt: new Date(),
    })
    .where(eq(syncLogs.id, logId));
}
