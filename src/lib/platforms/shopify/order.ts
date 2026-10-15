import { db } from "@/lib/db";
import { shopifyOrders, shopifyOrderItems, shopifyProducts, shopifyVariants, transactionFees } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateTransactionFee, hashEmail, type ShopifyOrder } from "./client";
import { successfulRefundAmount } from "./refunds";
import { snapshotId } from "../ads/snapshot";
import { sendNewOrderAlert } from "@/lib/telegram/notifications";

export async function persistShopifyOrder(brandId: string, order: ShopifyOrder) {
  const existing = await db.query.shopifyOrders.findFirst({ where: and(eq(shopifyOrders.brandId, brandId), eq(shopifyOrders.shopifyOrderId, Number(order.id))) });
  const refundAmount = successfulRefundAmount(order.refunds);
  const values = {
    brandId, shopifyOrderId: Number(order.id), orderNumber: String(order.order_number), emailHash: hashEmail(order.email),
    subtotalPrice: order.subtotal_price, totalShipping: order.total_shipping_price_set?.shop_money?.amount ?? "0", totalTax: order.total_tax, totalPrice: order.total_price, totalDiscounts: order.total_discounts,
    paymentGateway: order.payment_gateway_names?.[0] ?? null, financialStatus: order.financial_status, fulfillmentStatus: order.fulfillment_status ?? null,
    refundAmount: refundAmount.toFixed(2), cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null, processedAt: new Date(order.processed_at ?? order.created_at), updatedAt: new Date(),
  };
  const [saved] = await db.insert(shopifyOrders).values(values).onConflictDoUpdate({ target: [shopifyOrders.brandId, shopifyOrders.shopifyOrderId], set: values }).returning({ id: shopifyOrders.id });
  const variants = await db.select({ id: shopifyVariants.id, remoteId: shopifyVariants.shopifyVariantId, productId: shopifyVariants.productId, cost: shopifyVariants.costPerItem }).from(shopifyVariants).innerJoin(shopifyProducts, eq(shopifyVariants.productId, shopifyProducts.id)).where(eq(shopifyProducts.brandId, brandId));
  const costs = new Map(variants.map((variant) => [String(variant.remoteId), variant]));
  const previous = existing ? await db.query.shopifyOrderItems.findMany({ where: eq(shopifyOrderItems.orderId, saved.id) }) : [];
  const previousCosts = new Map(previous.map((item) => [String(item.shopifyLineItemId), item.costPerItem]));
  const activeItems = new Set<string>();
  for (const item of order.line_items ?? []) {
    activeItems.add(String(item.id));
    const variant = costs.get(String(item.variant_id));
    const cost = previousCosts.get(String(item.id)) ?? variant?.cost ?? item.variant?.inventory_item?.cost ?? null;
    const row = { orderId: saved.id, shopifyLineItemId: Number(item.id), variantId: variant?.id ?? null, productId: variant?.productId ?? null, title: item.title, quantity: String(item.quantity), price: item.price, costPerItem: cost, totalCost: cost !== null ? (Number(cost) * item.quantity).toFixed(2) : null };
    const old = previous.find((entry) => String(entry.shopifyLineItemId) === String(item.id));
    const id = old?.id ?? snapshotId(brandId, "shopify-item", saved.id, String(item.id));
    await db.insert(shopifyOrderItems).values({ id, ...row }).onConflictDoUpdate({ target: shopifyOrderItems.id, set: row });
  }
  for (const item of previous) if (!activeItems.has(String(item.shopifyLineItemId))) await db.delete(shopifyOrderItems).where(eq(shopifyOrderItems.id, item.id));
  const gateway = order.payment_gateway_names?.[0];
  if (gateway) {
    const fee = calculateTransactionFee(Number(order.total_price), gateway);
    const oldFee = await db.query.transactionFees.findFirst({ where: and(eq(transactionFees.orderId, saved.id), eq(transactionFees.gateway, gateway)) });
    const id = oldFee?.id ?? snapshotId(brandId, "shopify-fee", saved.id, gateway);
    const row = { orderId: saved.id, gateway, feePercentage: String(fee.percentage), feeFixed: String(fee.fixed), feeAmount: fee.amount.toFixed(2) };
    await db.insert(transactionFees).values({ id, ...row }).onConflictDoUpdate({ target: transactionFees.id, set: row });
  }
  if (!existing && order.financial_status === "paid" && process.env.TELEGRAM_BOT_TOKEN) {
    try { await sendNewOrderAlert({ brandId, orderNumber: String(order.order_number), total: Number(order.total_price), currency: order.currency }); } catch { console.error("Order saved, but notification delivery failed"); }
  }
  return { id: saved.id, created: !existing };
}
