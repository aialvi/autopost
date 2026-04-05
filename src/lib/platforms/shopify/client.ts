import crypto from "crypto";

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyProduct {
  id: bigint;
  title: string;
  status: string;
  variants: ShopifyVariant[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyVariant {
  id: bigint;
  product_id: bigint;
  title: string;
  sku: string | null;
  price: string;
  inventory_item_id: bigint;
  inventory_item?: {
    cost: string | null;
  };
}

export interface ShopifyOrder {
  id: bigint;
  order_number: number;
  email: string;
  subtotal_price: string;
  total_shipping_price_set: { shop_money: { amount: string } };
  total_tax: string;
  total_price: string;
  total_discounts: string;
  payment_gateway_names: string[];
  financial_status: string;
  fulfillment_status: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  refunds: ShopifyRefund[];
  line_items: ShopifyLineItem[];
}

export interface ShopifyRefund {
  created_at: string;
  transactions: {
    amount: string;
  }[];
}

export interface ShopifyLineItem {
  id: bigint;
  product_id: bigint | null;
  variant_id: bigint | null;
  title: string;
  quantity: number;
  price: string;
  product: {
    id: bigint;
  } | null;
  variant: {
    id: bigint;
    inventory_item_id: bigint;
    inventory_item?: {
      cost: string | null;
    };
  } | null;
}

export class ShopifyClient {
  private config: ShopifyConfig;
  private apiVersion: string;

  constructor(config: ShopifyConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || "2024-01";
  }

  private get baseUrl(): string {
    return `https://${this.config.storeDomain}/admin/api/${this.apiVersion}`;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": this.config.accessToken,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Shopify API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json();
  }

  async getProducts(params?: { limit?: number; since_id?: bigint }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.since_id) searchParams.set("since_id", params.since_id.toString());
    searchParams.set("status", "active");

    const response = await this.request<{ products: ShopifyProduct[] }>(
      `/products.json?${searchParams.toString()}`
    );
    return response.products;
  }

  async getProduct(productId: bigint) {
    const response = await this.request<{ product: ShopifyProduct }>(
      `/products/${productId}.json`
    );
    return response.product;
  }

  async getOrders(params?: {
    limit?: number;
    since_id?: bigint;
    status?: "any" | "open" | "closed" | "cancelled";
    processed_at_min?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.since_id)
      searchParams.set("since_id", params.since_id.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.processed_at_min)
      searchParams.set("processed_at_min", params.processed_at_min);

    const response = await this.request<{ orders: ShopifyOrder[] }>(
      `/orders.json?${searchParams.toString()}`
    );
    return response.orders;
  }

  async getOrder(orderId: bigint) {
    const response = await this.request<{ order: ShopifyOrder }>(
      `/orders/${orderId}.json`
    );
    return response.order;
  }

  async getShop() {
    const response = await this.request<{ shop: { id: bigint; name: string; email: string; currency: string } }>(
      `/shop.json`
    );
    return response.shop;
  }
}

export function verifyWebhookHMAC(
  body: string | Buffer,
  hmac: string,
  webhookSecret: string
): boolean {
    const digest = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("base64");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
}

export function calculateTransactionFee(
  orderTotal: number,
  gateway: string
): { percentage: number; fixed: number; amount: number } {
  // Default Shopify transaction fees
  const fees: Record<string, { percentage: number; fixed: number }> = {
    shopify_payments: { percentage: 0.029, fixed: 0.30 },
    paypal: { percentage: 0.0349, fixed: 0.49 },
    stripe: { percentage: 0.029, fixed: 0.30 },
    authorize_net: { percentage: 0.029, fixed: 0.30 },
    worldpay: { percentage: 0.029, fixed: 0.30 },
  };

  const fee = fees[gateway.toLowerCase()] || { percentage: 0.029, fixed: 0.30 };
  const amount = orderTotal * fee.percentage + fee.fixed;

  return {
    ...fee,
    amount: Math.round(amount * 100) / 100,
  };
}

export function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}
