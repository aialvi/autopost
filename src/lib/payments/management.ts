/**
 * Payment Management Utilities
 * Handle subscriptions, invoices, and billing operations
 */

import { db } from "@/lib/db";
import {
  subscriptions,
  invoices,
  paymentMethods,
  usageRecords,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import {
  getPolarSubscription,
  getPolarInvoice,
  createPolarCheckout,
  cancelPolarSubscription,
  type PolarSubscription,
  type PolarInvoice,
} from "./polar";

export interface SubscriptionDetails {
  id: string;
  tier: string;
  status: string;
  currency: string;
  amount: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  polarSubscriptionId: string | null;
}

export interface InvoiceDetails {
  id: string;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  dueDate: Date | null;
  paidAt: Date | null;
  description: string | null;
  polarInvoiceUrl: string | null;
  createdAt: Date;
}

/**
 * Get subscription for a brand
 */
export async function getBrandSubscription(
  brandId: string
): Promise<SubscriptionDetails | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.brandId, brandId),
  });

  if (!subscription) {
    // Return default free tier
    return {
      id: "",
      tier: "free",
      status: "active",
      currency: "USD",
      amount: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialStart: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      polarSubscriptionId: null,
    };
  }

  // If connected to Polar, sync latest status
  if (subscription.polarSubscriptionId) {
    try {
      const polarSub = await getPolarSubscription(subscription.polarSubscriptionId);
      if (polarSub) {
        // Update local subscription with latest data from Polar
        await db
          .update(subscriptions)
          .set({
            status: polarSub.status,
            currentPeriodStart: new Date(polarSub.current_period_start),
            currentPeriodEnd: new Date(polarSub.current_period_end),
            cancelAtPeriodEnd: polarSub.cancel_at_period_end,
            canceledAt: polarSub.canceled_at
              ? new Date(polarSub.canceled_at)
              : null,
            trialStart: polarSub.trial_start
              ? new Date(polarSub.trial_start)
              : null,
            trialEnd: polarSub.trial_end ? new Date(polarSub.trial_end) : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));
      }
    } catch (error) {
      console.error("Error syncing Polar subscription:", error);
    }
  }

  return {
    id: subscription.id,
    tier: subscription.tier,
    status: subscription.status,
    currency: subscription.currency,
    amount: parseFloat(subscription.amount),
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt,
    polarSubscriptionId: subscription.polarSubscriptionId,
  };
}

/**
 * Get invoices for a brand
 */
export async function getBrandInvoices(
  brandId: string,
  limit = 20
): Promise<InvoiceDetails[]> {
  const records = await db.query.invoices.findMany({
    where: eq(invoices.brandId, brandId),
    orderBy: [desc(invoices.createdAt)],
    limit,
  });

  // Sync any pending invoices from Polar
  for (const record of records) {
    if (record.polarInvoiceId && record.status !== "paid") {
      try {
        const polarInvoice = await getPolarInvoice(record.polarInvoiceId);
        if (polarInvoice && polarInvoice.status !== record.status) {
          await db
            .update(invoices)
            .set({
              status: polarInvoice.status,
              paidAt: polarInvoice.paid_at
                ? new Date(polarInvoice.paid_at)
                : null,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, record.id));
        }
      } catch (error) {
        console.error("Error syncing Polar invoice:", error);
      }
    }
  }

  // Fetch updated records
  const updatedRecords = await db.query.invoices.findMany({
    where: eq(invoices.brandId, brandId),
    orderBy: [desc(invoices.createdAt)],
    limit,
  });

  return updatedRecords.map((record) => ({
    id: record.id,
    status: record.status,
    currency: record.currency,
    subtotal: parseFloat(record.subtotal),
    tax: parseFloat(record.tax),
    total: parseFloat(record.total),
    dueDate: record.dueDate,
    paidAt: record.paidAt,
    description: record.description,
    polarInvoiceUrl: record.polarInvoiceUrl,
    createdAt: record.createdAt,
  }));
}

/**
 * Create a checkout session for a subscription upgrade
 */
export async function createSubscriptionCheckout(
  brandId: string,
  tier: string,
  userEmail: string
): Promise<{ checkoutUrl: string; subscriptionId: string } | null> {
  // Map tier to Polar product ID
  const productIds: Record<string, string> = {
    starter: process.env.POLAR_STARTER_PRODUCT_ID || "",
    pro: process.env.POLAR_PRO_PRODUCT_ID || "",
    enterprise: process.env.POLAR_ENTERPRISE_PRODUCT_ID || "",
  };

  const productId = productIds[tier];
  if (!productId) {
    return null;
  }

  const checkout = await createPolarCheckout(productId, userEmail, {
    brandId,
    tier,
  });

  if (!checkout) {
    return null;
  }

  // Create a placeholder subscription record
  const newSubscription = await db
    .insert(subscriptions)
    .values({
      brandId,
      tier,
      status: "incomplete",
      currency: "USD",
      amount: tier === "starter" ? "29" : tier === "pro" ? "99" : "299",
    })
    .returning();

  return {
    checkoutUrl: checkout.checkoutUrl,
    subscriptionId: newSubscription[0].id,
  };
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true
): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  });

  if (!subscription) {
    return false;
  }

  // If connected to Polar, cancel there too
  if (subscription.polarSubscriptionId) {
    const polarSub = await cancelPolarSubscription(
      subscription.polarSubscriptionId,
      cancelAtPeriodEnd
    );
    if (!polarSub) {
      return false;
    }
  }

  // Update local record
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd,
      canceledAt: cancelAtPeriodEnd ? null : new Date(),
      status: cancelAtPeriodEnd ? "active" : "canceled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));

  return true;
}

/**
 * Record usage for metered billing
 */
export async function recordUsage(
  brandId: string,
  metric: string,
  quantity: number,
  unit: string,
  periodStart: Date,
  periodEnd: Date,
  description?: string
): Promise<void> {
  await db.insert(usageRecords).values({
    brandId,
    metric,
    quantity: quantity.toString(),
    unit,
    periodStart,
    periodEnd,
    description,
  });
}

/**
 * Get usage for a brand in a period
 */
export async function getBrandUsage(
  brandId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<
  Array<{ metric: string; quantity: number; unit: string; description: string | null }>
> {
  const records = await db.query.usageRecords.findMany({
    where: and(
      eq(usageRecords.brandId, brandId),
      gte(usageRecords.periodStart, periodStart),
      lte(usageRecords.periodEnd, periodEnd)
    ),
  });

  // Aggregate by metric
  const aggregated: Record<
    string,
    { quantity: number; unit: string; description: string | null }
  > = {};

  for (const record of records) {
    if (!aggregated[record.metric]) {
      aggregated[record.metric] = {
        quantity: 0,
        unit: record.unit || "",
        description: record.description,
      };
    }
    aggregated[record.metric].quantity += parseFloat(record.quantity);
  }

  return Object.entries(aggregated).map(([metric, data]) => ({
    metric,
    ...data,
  }));
}

/**
 * Check if a brand can perform an action based on their tier limits
 */
export async function checkTierLimit(
  brandId: string,
  limit: "brands" | "apiCalls" | "dataRetention"
): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const subscription = await getBrandSubscription(brandId);
  const { PRICING_TIERS } = await import("./polar");

  const tierLimits = PRICING_TIERS[subscription?.tier as keyof typeof PRICING_TIERS]?.limits ||
    PRICING_TIERS.free.limits;

  let current = 0;
  let limitValue: number | null = tierLimits[limit as keyof typeof tierLimits] as number || null;

  if (limit === "brands") {
    // Count brands for this user
    // This would need user context - for now return allowed
    return { allowed: true, current: 1, limit: limitValue };
  }

  if (limit === "apiCalls") {
    // Get usage for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const apiUsage = await getBrandUsage(brandId, monthStart, monthEnd);
    current = apiUsage.find((u) => u.metric === "api_calls")?.quantity || 0;
    limitValue = (tierLimits as any).apiCallsPerMonth;
  }

  if (limit === "dataRetention") {
    // Data retention is calculated differently
    current = (tierLimits as any).dataRetentionDays === -1 ? 365 : (tierLimits as any).dataRetentionDays;
    limitValue = (tierLimits as any).dataRetentionDays;
    return { allowed: true, current, limit: limitValue };
  }

  if (limitValue === -1) {
    // Unlimited
    return { allowed: true, current, limit: null };
  }

  return {
    allowed: current < limitValue!,
    current,
    limit: limitValue,
  };
}

/**
 * Calculate prorated amount for mid-period tier changes
 */
export function calculateProratedAmount(
  fullAmount: number,
  periodStart: Date,
  periodEnd: Date,
  changeDate: Date
): number {
  const totalDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const remainingDays = Math.ceil(
    (periodEnd.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.round((fullAmount * remainingDays) / totalDays);
}
