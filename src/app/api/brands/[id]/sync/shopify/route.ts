import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformConnections } from "@/lib/db/schema";
import { hasBrandAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { syncShopifyProducts, syncShopifyOrders } from "@/lib/platforms/shopify";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteContext) {
  const session = await auth();
  const { id: brandId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await hasBrandAccess(session.user.id, brandId);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { type } = body;

    // Get Shopify connection
    const connection = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.platform, "shopify")
      ),
    });

    if (!connection) {
      return NextResponse.json({ error: "Shopify not connected" }, { status: 400 });
    }

    const { accountId: storeDomain, accessToken } = connection;

    switch (type) {
      case "products":
        const productsResult = await syncShopifyProducts(brandId, storeDomain, accessToken);
        return NextResponse.json({ type: "products", result: productsResult });

      case "orders":
        const ordersResult = await syncShopifyOrders(brandId, storeDomain, accessToken);
        return NextResponse.json({ type: "orders", result: ordersResult });

      default:
        return NextResponse.json({ error: "Invalid sync type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error syncing Shopify data:", error);
    return NextResponse.json({ error: "Failed to sync data" }, { status: 500 });
  }
}
