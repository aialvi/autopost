import { verifyShopifyWebhook, handleShopifyWebhook } from "@/lib/platforms/shopify/webhooks";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Verify webhook
    const isValid = await verifyShopifyWebhook(req);
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get webhook headers
    const headersList = await req.headers;
    const topic = headersList.get("x-shopify-topic");
    const shopDomain = headersList.get("x-shopify-shop-domain");

    if (!topic || !shopDomain) {
      return NextResponse.json({ error: "Invalid headers" }, { status: 400 });
    }

    // Parse body
    const data = await req.json();

    // Handle webhook
    await handleShopifyWebhook(topic, shopDomain, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling Shopify webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
