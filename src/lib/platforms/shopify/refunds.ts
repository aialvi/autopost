import type { ShopifyRefund } from "./client";

// Pending/failed transactions have not returned money to the customer.
export function successfulRefundAmount(refunds: ShopifyRefund[] = []): number {
  return refunds.reduce((sum, refund) => sum + (refund.transactions ?? []).reduce((total, transaction) => {
    if (transaction.kind !== "refund" || transaction.status !== "success") return total;
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid Shopify refund amount");
    return total + amount;
  }, 0), 0);
}
