import crypto from "crypto";
import { db } from "@/lib/db";
import {
  shopifyProducts,
  shopifyVariants,
  shopifyOrders,
  shopifyOrderItems,
  transactionFees,
  syncLogs,
} from "@/lib/db/schema";
import { ShopifyClient, calculateTransactionFee, hashEmail } from "./client";
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
              where: eq(shopifyVariants.shopifyVariantId, bigintToNumber(variant.id)),
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
        const existing = await db.query.shopifyOrders.findFirst({
          where: and(
            eq(shopifyOrders.brandId, brandId),
            eq(shopifyOrders.shopifyOrderId, bigintToNumber(order.id))
          ),
        });

        if (!existing) {
          // Create new order
          const [newOrder] = await db
            .insert(shopifyOrders)
            .values({
              brandId,
              shopifyOrderId: bigintToNumber(order.id),
              orderNumber: order.order_number.toString(),
              emailHash: hashEmail(order.email),
              subtotalPrice: order.subtotal_price,
              totalShipping: order.total_shipping_price_set.shop_money.amount,
              totalTax: order.total_tax,
              totalPrice: order.total_price,
              totalDiscounts: order.total_discounts,
              paymentGateway: order.payment_gateway_names[0] || null,
              financialStatus: order.financial_status,
              fulfillmentStatus: order.fulfillment_status || null,
              processedAt: order.processed_at ? new Date(order.processed_at) : null,
            })
            .returning();
          created++;

          // Calculate and store transaction fees
          for (const gateway of order.payment_gateway_names) {
            const fee = calculateTransactionFee(
              parseFloat(order.total_price),
              gateway
            );
            await db.insert(transactionFees).values({
              orderId: newOrder.id,
              gateway,
              feePercentage: fee.percentage.toString(),
              feeFixed: fee.fixed.toString(),
              feeAmount: fee.amount.toString(),
            });
          }

          // Sync line items
          for (const item of order.line_items) {
            await db.insert(shopifyOrderItems).values({
              orderId: newOrder.id,
              shopifyLineItemId: bigintToNumber(item.id),
              variantId: item.variant_id
                ? await db.query.shopifyVariants
                    .findFirst({
                      where: eq(shopifyVariants.shopifyVariantId, bigintToNumber(item.variant_id)),
                      columns: { id: true },
                    })
                    .then((v) => v?.id || null)
                : null,
              title: item.title,
              quantity: item.quantity.toString(),
              price: item.price,
              costPerItem: item.variant?.inventory_item?.cost || null,
              totalCost: item.variant?.inventory_item?.cost
                ? (parseFloat(item.variant.inventory_item.cost) * item.quantity).toString()
                : null,
            });
          }

          // Handle refunds
          if (order.refunds.length > 0) {
            const totalRefund = order.refunds.reduce(
              (sum, refund) =>
                sum +
                refund.transactions.reduce(
                  (tSum, t) => tSum + parseFloat(t.amount),
                  0
                ),
              0
            );
            await db
              .update(shopifyOrders)
              .set({ refundAmount: totalRefund.toString() })
              .where(eq(shopifyOrders.id, newOrder.id));
          }
        } else {
          // Update existing order if needed
          await db
            .update(shopifyOrders)
            .set({
              financialStatus: order.financial_status,
              fulfillmentStatus: order.fulfillment_status || null,
              updatedAt: new Date(),
            })
            .where(eq(shopifyOrders.id, existing.id));
          updated++;
        }
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error);
        errors++;
      }
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
