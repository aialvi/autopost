import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhook, parsePolarWebhook } from "@/lib/payments/polar";
import { db } from "@/lib/db";
import { subscriptions, invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST - Handle Polar.sh webhooks
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-polar-signature") || "";
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    // Verify webhook signature
    if (webhookSecret && !verifyPolarWebhook(body, signature, webhookSecret)) {
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
        const data = event.data as any;
        await handleSubscriptionUpdate(data);
        break;
      }

      case "subscription.canceled": {
        const data = event.data as any;
        await handleSubscriptionCancel(data);
        break;
      }

      case "invoice.created":
      case "invoice.updated":
      case "invoice.paid": {
        const data = event.data as any;
        await handleInvoiceUpdate(data);
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

async function handleSubscriptionUpdate(data: any) {
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

async function handleSubscriptionCancel(data: any) {
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

async function handleInvoiceUpdate(data: any) {
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
