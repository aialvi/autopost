import { persistShopifyOrder } from "./order";
import { revealSecret } from "../connection-secrets";
import { ShopifyClient } from "./client";
import { NextRequest } from "next/server";
import { verifyWebhookHMAC } from "./client";
import { db } from "@/lib/db";
import { shopifyOrders, platformConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface ShopifyWebhookHeaders {
  "X-Shopify-Topic": string;
  "X-Shopify-Hmac-Sha256": string;
  "X-Shopify-Shop-Domain": string;
  "X-Shopify-Api-Version": string;
}

export async function verifyShopifyWebhook(
  request: NextRequest
): Promise<boolean> {
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmac || !webhookSecret) {
    return false;
  }

  const rawBody = await request.clone().text();
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
      await persistShopifyOrder(brandId, data);
      break;
    case "orders/cancelled":
      await handleOrderCancelled(brandId, data);
      break;
    case "refunds/create":
      // Read the authoritative order so webhook retries never add the refund twice.
      const client = new ShopifyClient({ storeDomain: connection.accountId, accessToken: revealSecret(connection.accessToken) });
      await persistShopifyOrder(brandId, await client.getOrder(data.order_id));
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

