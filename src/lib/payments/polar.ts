/**
 * Polar.sh Payment Integration
 * Handles subscriptions, invoices, and webhooks from Polar.sh
 */

const POLAR_API_URL = "https://api.polar.sh";
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

export interface PolarProduct {
  id: string;
  name: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  recurringInterval: "month" | "year";
  benefits: string[];
}

export interface PolarSubscription {
  id: string;
  product_id: string;
  customer_id: string;
  status: "active" | "canceled" | "past_due" | "incomplete" | "trialing";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
}

export interface PolarInvoice {
  id: string;
  subscription_id?: string;
  customer_id: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  due_date?: string;
  paid_at?: string;
  hosted_invoice_url: string;
}

export interface PolarCustomer {
  id: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

/**
 * Get Polar products available for subscription
 */
export async function getPolarProducts(): Promise<PolarProduct[]> {
  if (!POLAR_ACCESS_TOKEN) {
    return [];
  }

  try {
    const response = await fetch(`${POLAR_API_URL}/v1/products`, {
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching Polar products:", error);
    return [];
  }
}

/**
 * Get subscription details from Polar
 */
export async function getPolarSubscription(
  subscriptionId: string
): Promise<PolarSubscription | null> {
  if (!POLAR_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(
      `${POLAR_API_URL}/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Polar subscription:", error);
    return null;
  }
}

/**
 * Get customer subscriptions from Polar
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<PolarSubscription[]> {
  if (!POLAR_ACCESS_TOKEN) {
    return [];
  }

  try {
    const response = await fetch(
      `${POLAR_API_URL}/v1/customers/${customerId}/subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching customer subscriptions:", error);
    return [];
  }
}

/**
 * Get customer invoices from Polar
 */
export async function getCustomerInvoices(
  customerId: string
): Promise<PolarInvoice[]> {
  if (!POLAR_ACCESS_TOKEN) {
    return [];
  }

  try {
    const response = await fetch(
      `${POLAR_API_URL}/v1/customers/${customerId}/invoices`,
      {
        headers: {
          Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching customer invoices:", error);
    return [];
  }
}

/**
 * Get invoice details from Polar
 */
export async function getPolarInvoice(
  invoiceId: string
): Promise<PolarInvoice | null> {
  if (!POLAR_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(
      `${POLAR_API_URL}/v1/invoices/${invoiceId}`,
      {
        headers: {
          Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Polar invoice:", error);
    return null;
  }
}

/**
 * Create a checkout session for Polar
 */
export async function createPolarCheckout(
  productId: string,
  customerEmail: string,
  metadata?: Record<string, string>
): Promise<{ checkoutUrl: string } | null> {
  if (!POLAR_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${POLAR_API_URL}/v1/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        customer_email: customerEmail,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
        metadata,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { checkoutUrl: data.url };
  } catch (error) {
    console.error("Error creating Polar checkout:", error);
    return null;
  }
}

/**
 * Create a customer in Polar
 */
export async function createPolarCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<PolarCustomer | null> {
  if (!POLAR_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${POLAR_API_URL}/v1/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        name,
        metadata,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating Polar customer:", error);
    return null;
  }
}

/**
 * Cancel a Polar subscription
 */
export async function cancelPolarSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true
): Promise<PolarSubscription | null> {
  if (!POLAR_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(
      `${POLAR_API_URL}/v1/subscriptions/${subscriptionId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancel_at_period_end: cancelAtPeriodEnd,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error canceling Polar subscription:", error);
    return null;
  }
}

/**
 * Verify Polar webhook signature
 */
export function verifyPolarWebhook(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret) {
    return false;
  }

  // Polar uses HMAC-SHA256 for webhook signatures
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", webhookSecret);
  hmac.update(payload);
  const digest = hmac.digest("hex");

  return signature === digest;
}

/**
 * Parse webhook event from Polar
 */
export interface PolarWebhookEvent {
  type: string;
  data: {
    id: string;
    [key: string]: any;
  };
  timestamp: string;
}

export function parsePolarWebhook(
  payload: string
): PolarWebhookEvent | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Get pricing tiers
 */
export const PRICING_TIERS = {
  free: {
    name: "Free",
    price: 0,
    currency: "USD",
    interval: null,
    features: [
      "1 brand",
      "Basic profit tracking",
      "7-day data retention",
      "Community support",
    ],
    limits: {
      brands: 1,
      dataRetentionDays: 7,
      apiCallsPerMonth: 100,
    },
  },
  starter: {
    name: "Starter",
    price: 29,
    currency: "USD",
    interval: "month" as const,
    features: [
      "3 brands",
      "Advanced profit analytics",
      "90-day data retention",
      "Email support",
      "Telegram notifications",
      "Basic attribution",
    ],
    limits: {
      brands: 3,
      dataRetentionDays: 90,
      apiCallsPerMonth: 1000,
    },
  },
  pro: {
    name: "Pro",
    price: 99,
    currency: "USD",
    interval: "month" as const,
    features: [
      "10 brands",
      "AI-powered insights",
      "Unlimited data retention",
      "Priority support",
      "All notification channels",
      "Advanced attribution models",
      "CAPI integration",
      "Custom reports",
    ],
    limits: {
      brands: 10,
      dataRetentionDays: -1, // unlimited
      apiCallsPerMonth: 10000,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: 299,
    currency: "USD",
    interval: "month" as const,
    features: [
      "Unlimited brands",
      "Custom AI models",
      "Dedicated support",
      "SLA guarantee",
      "White-label options",
      "API access",
      "Custom integrations",
      "On-premise deployment option",
    ],
    limits: {
      brands: -1, // unlimited
      dataRetentionDays: -1,
      apiCallsPerMonth: -1, // unlimited
    },
  },
} as const;

export type PricingTier = keyof typeof PRICING_TIERS;
