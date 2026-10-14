import { z } from "zod";
import { verifyPolarEvent } from "@/lib/webhooks/verify";
import { NextResponse } from "next/server";
import { parsePolarWebhook } from "@/lib/payments/polar";
import { db } from "@/lib/db";
import { subscriptions, invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const subscriptionPayload = z.object({
  id: z.string(), product_id: z.string(), customer_id: z.string(), status: z.string(),
  current_period_start: z.string(), current_period_end: z.string(), cancel_at_period_end: z.boolean(),
  trial_start: z.string().nullable().optional(), trial_end: z.string().nullable().optional(),
  product_metadata: z.object({ tier: z.string().optional() }).optional(),
  metadata: z.object({ brandId: z.string().optional() }).optional(),
});
const invoicePayload = z.object({
  id: z.string(), hosted_invoice_url: z.string().nullable().optional(), status: z.string(), currency: z.string(),
  subtotal: z.union([z.string(), z.number()]), tax: z.union([z.string(), z.number()]), total: z.union([z.string(), z.number()]),
  due_date: z.string().nullable().optional(), paid_at: z.string().nullable().optional(), subscription_id: z.string(),
});

/**
 * POST - Handle Polar.sh webhooks
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    if (!webhookSecret) return NextResponse.json({ error: "Billing webhooks are not configured" }, { status: 503 });
    if (!verifyPolarEvent(body, req.headers, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = parsePolarWebhook(body);
    if (!event) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated": {
        await handleSubscriptionUpdate(subscriptionPayload.parse(event.data));
        break;
      }

      case "subscription.canceled": {
        await handleSubscriptionCancel(z.object({ id: z.string() }).parse(event.data));
        break;
      }

      case "invoice.created":
      case "invoice.updated":
      case "invoice.paid": {
        await handleInvoiceUpdate(invoicePayload.parse(event.data));
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(data: z.infer<typeof subscriptionPayload>) {
  // Find subscription by Polar ID or create new one
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.polarSubscriptionId, data.id),
  });

  const subscriptionData = {
    polarSubscriptionId: data.id,
    polarProductId: data.product_id,
    polarCustomerId: data.customer_id,
    status: data.status,
    currentPeriodStart: new Date(data.current_period_start),
    currentPeriodEnd: new Date(data.current_period_end),
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialStart: data.trial_start ? new Date(data.trial_start) : null,
    trialEnd: data.trial_end ? new Date(data.trial_end) : null,
  };

  if (existing) {
    await db
      .update(subscriptions)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(subscriptions.id, existing.id));
  } else {
    // Determine tier from product metadata or product ID
    let tier = "starter";
    if (data.product_metadata?.tier) {
      tier = data.product_metadata.tier;
    }

    await db.insert(subscriptions).values({
      ...subscriptionData,
      brandId: data.metadata?.brandId || "",
      tier,
      currency: "USD",
      amount: "0", // Will be updated from product
    });
  }
}

async function handleSubscriptionCancel(data: { id: string }) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.polarSubscriptionId, data.id),
  });

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));
  }
}

async function handleInvoiceUpdate(data: z.infer<typeof invoicePayload>) {
  const existing = await db.query.invoices.findFirst({
    where: eq(invoices.polarInvoiceId, data.id),
  });

  const invoiceData = {
    polarInvoiceId: data.id,
    polarInvoiceUrl: data.hosted_invoice_url,
    status: data.status,
    currency: data.currency,
    subtotal: data.subtotal.toString(),
    tax: data.tax.toString(),
    total: data.total.toString(),
    dueDate: data.due_date ? new Date(data.due_date) : null,
    paidAt: data.paid_at ? new Date(data.paid_at) : null,
  };

  if (existing) {
    await db
      .update(invoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(eq(invoices.id, existing.id));
  } else {
    // Find associated subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.polarSubscriptionId, data.subscription_id),
    });

    await db.insert(invoices).values({
      ...invoiceData,
      brandId: subscription?.brandId || "",
      subscriptionId: subscription?.id,
      description: `Invoice for ${subscription?.tier || "subscription"} plan`,
    });
  }
}
