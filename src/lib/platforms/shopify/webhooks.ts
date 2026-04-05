import crypto from "crypto";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHMAC, hashEmail } from "./client";
import { db } from "@/lib/db";
import { shopifyOrders, shopifyOrderItems, transactionFees, platformConnections, shopifyVariants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateTransactionFee } from "./client";

export interface ShopifyWebhookHeaders {
  "X-Shopify-Topic": string;
  "X-Shopify-Hmac-Sha256": string;
  "X-Shopify-Shop-Domain": string;
  "X-Shopify-Api-Version": string;
}

export async function verifyShopifyWebhook(
  request: NextRequest
): Promise<boolean> {
  const headersList = await headers();
  const hmac = headersList.get("x-shopify-hmac-sha256");
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmac || !webhookSecret) {
    return false;
  }

  const rawBody = await request.text();
  return verifyWebhookHMAC(rawBody, hmac, webhookSecret);
}

export async function handleShopifyWebhook(
  topic: string,
  shopDomain: string,
  data: any
): Promise<void> {
  // Find the platform connection for this shop
  const connection = await db.query.platformConnections.findFirst({
    where: and(
      eq(platformConnections.platform, "shopify"),
      eq(platformConnections.accountId, shopDomain)
    ),
  });

  if (!connection) {
    console.error(`No connection found for shop: ${shopDomain}`);
    return;
  }

  const brandId = connection.brandId;

  switch (topic) {
    case "app/uninstalled":
      await handleAppUninstalled(brandId, shopDomain);
      break;
    case "orders/create":
    case "orders/updated":
    case "orders/paid":
      await handleOrder(brandId, data);
      break;
    case "orders/cancelled":
      await handleOrderCancelled(brandId, data);
      break;
    case "refunds/create":
      await handleRefundCreated(brandId, data);
      break;
    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }
}

function bigintToNumber(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

async function handleAppUninstalled(brandId: string, shopDomain: string) {
  await db
    .update(platformConnections)
    .set({ status: "expired" })
    .where(
      and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.accountId, shopDomain)
      )
    );
}

async function handleOrder(brandId: string, order: any) {
  const existing = await db.query.shopifyOrders.findFirst({
    where: and(
      eq(shopifyOrders.brandId, brandId),
      eq(shopifyOrders.shopifyOrderId, bigintToNumber(order.id))
    ),
  });

  if (existing) {
    // Update existing order
    await db
      .update(shopifyOrders)
      .set({
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status || null,
        updatedAt: new Date(),
      })
      .where(eq(shopifyOrders.id, existing.id));
  } else {
    // Create new order
    const [newOrder] = await db
      .insert(shopifyOrders)
      .values({
        brandId,
        shopifyOrderId: bigintToNumber(order.id),
        orderNumber: order.order_number.toString(),
        emailHash: hashEmail(order.email),
        subtotalPrice: order.subtotal_price.toString(),
        totalShipping: order.total_shipping_price_set?.shop_money?.amount || "0",
        totalTax: order.total_tax.toString(),
        totalPrice: order.total_price.toString(),
        totalDiscounts: order.total_discounts.toString(),
        paymentGateway: order.payment_gateway_names?.[0] || null,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status || null,
        processedAt: order.processed_at ? new Date(order.processed_at) : null,
      })
      .returning();

    // Calculate and store transaction fees
    if (order.payment_gateway_names) {
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
    }

    // Sync line items
    if (order.line_items) {
      for (const item of order.line_items) {
        // Find variant ID
        const variantId = item.variant_id
          ? await db.query.shopifyVariants
              .findFirst({
                where: eq(shopifyVariants.shopifyVariantId, bigintToNumber(item.variant_id)),
                columns: { id: true },
              })
              .then((v) => v?.id || null)
          : null;

        await db.insert(shopifyOrderItems).values({
          orderId: newOrder.id,
          shopifyLineItemId: bigintToNumber(item.id),
          variantId,
          title: item.title,
          quantity: item.quantity.toString(),
          price: item.price.toString(),
          costPerItem: item.variant?.inventory_item?.cost?.toString() || null,
          totalCost: item.variant?.inventory_item?.cost
            ? (parseFloat(item.variant.inventory_item.cost) * item.quantity).toString()
            : null,
        });
      }
    }
  }
}

async function handleOrderCancelled(brandId: string, order: any) {
  await db
    .update(shopifyOrders)
    .set({
      cancelledAt: new Date(order.cancelled_at),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shopifyOrders.brandId, brandId),
        eq(shopifyOrders.shopifyOrderId, bigintToNumber(order.id))
      )
    );
}

async function handleRefundCreated(brandId: string, refund: any) {
  // Find the order
  const order = await db.query.shopifyOrders.findFirst({
    where: eq(shopifyOrders.shopifyOrderId, bigintToNumber(refund.order_id)),
  });

  if (!order) {
    return;
  }

  // Calculate total refund amount
  const totalRefund = refund.transactions?.reduce(
    (sum: number, t: any) => sum + parseFloat(t.amount),
    0
  ) || 0;

  // Update the order with the new refund amount
  await db
    .update(shopifyOrders)
    .set({
      refundAmount: (parseFloat(order.refundAmount || "0") + totalRefund).toString(),
      updatedAt: new Date(),
    })
    .where(eq(shopifyOrders.id, order.id));
}
