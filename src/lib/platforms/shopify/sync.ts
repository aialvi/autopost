import { persistShopifyOrder } from "./order";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  shopifyProducts,
  shopifyVariants,
  syncLogs,
  platformConnections,
} from "@/lib/db/schema";
import { ShopifyClient } from "./client";
import { snapshotId } from "../ads/snapshot";
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
    const inventoryIds = [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.inventory_item_id)).filter(Boolean))];
    const inventory = await client.getInventoryItems(inventoryIds);
    const costs = new Map(inventory.map((item) => [String(item.id), item.cost]));
    for (const product of products) {
      try {
        const existing = await db.query.shopifyProducts.findFirst({ where: and(eq(shopifyProducts.brandId, brandId), eq(shopifyProducts.shopifyProductId, Number(product.id))) });
        const values = { brandId, shopifyProductId: Number(product.id), title: product.title, status: product.status, handle: product.handle ?? null, imageUrl: product.image?.src ?? null, updatedAt: new Date() };
        const [saved] = await db.insert(shopifyProducts).values(values).onConflictDoUpdate({ target: [shopifyProducts.brandId, shopifyProducts.shopifyProductId], set: values }).returning({ id: shopifyProducts.id });
        for (const variant of product.variants) {
          const existingVariant = await db.query.shopifyVariants.findFirst({ where: and(eq(shopifyVariants.productId, saved.id), eq(shopifyVariants.shopifyVariantId, Number(variant.id))) });
          const row = { productId: saved.id, shopifyVariantId: Number(variant.id), title: variant.title, sku: variant.sku, price: variant.price, costPerItem: costs.get(String(variant.inventory_item_id)) ?? null, inventoryItemId: Number(variant.inventory_item_id), updatedAt: new Date() };
          await db.insert(shopifyVariants).values({ id: existingVariant?.id ?? snapshotId(brandId, "shopify-variant", saved.id, String(variant.id)), ...row }).onConflictDoUpdate({ target: shopifyVariants.id, set: row });
        }
        if (existing) updated++; else created++;
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

// All entry points import costs before orders, so order costs are snapshotted correctly.
export async function syncShopifyStore(brandId: string, storeDomain: string, accessToken: string, type: "all" | "products" | "orders" = "all") {
  const result = { created: 0, updated: 0, errors: 0 };
  for (const step of type === "products" ? ["products"] : ["products", "orders"]) {
    const logId = await logSync(brandId, "shopify", step as "products" | "orders", "started", 0);
    try {
      const part = step === "products" ? await syncShopifyProducts(brandId, storeDomain, accessToken) : await syncShopifyOrders(brandId, storeDomain, accessToken);
      await updateSyncLog(logId, part.errors ? "partial" : "success", part.created + part.updated, part.errors ? `${part.errors} records failed. Check Shopify permissions and retry.` : undefined);
      result.created += part.created; result.updated += part.updated; result.errors += part.errors;
      if (part.errors) break;
    } catch (error) {
      await updateSyncLog(logId, "failed", 0, "Import failed. Check Shopify permissions and retry.");
      throw error;
    }
  }
  if (!result.errors && type !== "products") {
    await db.update(platformConnections).set({ lastSyncedAt: new Date(), updatedAt: new Date() }).where(and(eq(platformConnections.brandId, brandId), eq(platformConnections.platform, "shopify"), eq(platformConnections.accountId, storeDomain), eq(platformConnections.status, "active")));
  }
  return result;
}
