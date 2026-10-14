import { protectSecret, safeConnection } from "@/lib/platforms/connection-secrets";
import { getDemoApiResponse } from "@/lib/demo/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformConnections, brands } from "@/lib/db/schema";
import { hasBrandAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { ShopifyClient, syncShopifyStore } from "@/lib/platforms/shopify";

export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();
  const demoResponse = getDemoApiResponse(session?.user?.id, req);
  if (demoResponse) return demoResponse;
  const { id: brandId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await hasBrandAccess(session.user.id, brandId);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const connection = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.platform, "shopify")
      ),
    });

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Don't expose the full access token
    return NextResponse.json({ connected: true, connection: safeConnection(connection) });
  } catch (error) {
    console.error("Error fetching Shopify connection:", error);
    return NextResponse.json({ error: "Failed to fetch connection" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  const session = await auth();
  const demoResponse = getDemoApiResponse(session?.user?.id, req);
  if (demoResponse) return demoResponse;
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
    const storeDomain = typeof body.storeDomain === "string" ? body.storeDomain.trim().toLowerCase() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";

    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(storeDomain) || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate credentials by making a test request
    const client = new ShopifyClient({ storeDomain, accessToken });
    let shop;
    try {
      shop = await client.getShop();
    } catch {
      return NextResponse.json({ error: "Invalid Shopify credentials" }, { status: 400 });
    }

    const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
    if (brand?.currency !== shop.currency) return NextResponse.json({ error: `Set your brand currency to ${shop.currency} before connecting this store. Currency conversion is not supported.` }, { status: 400 });

    // Check for existing connection
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.platform, "shopify")
      ),
    });

    if (existing && existing.accountId !== storeDomain) return NextResponse.json({ error: "Use a separate brand for a different Shopify store to keep sales history separate." }, { status: 400 });

    if (existing) {
      // Update existing connection
      await db
        .update(platformConnections)
        .set({
          accountId: storeDomain,
          accessToken: protectSecret(accessToken),
          status: "active",
          lastSyncedAt: existing?.lastSyncedAt ?? null,
          updatedAt: new Date(),
          metadata: { myshopifyDomain: storeDomain, storefrontDomain: shop.domain },
        })
        .where(eq(platformConnections.id, existing.id));
    } else {
      // Create new connection
      await db.insert(platformConnections).values({
        brandId,
        platform: "shopify",
        accountId: storeDomain,
        accessToken: protectSecret(accessToken),
        status: "active",
        lastSyncedAt: null,
        metadata: { myshopifyDomain: storeDomain, storefrontDomain: shop.domain },
      });
    }

    after(async () => {
      try { await syncShopifyStore(brandId, storeDomain, accessToken); }
      catch { console.error("Initial Shopify sync failed", brandId); }
    });
    return NextResponse.json({ success: true, syncStarted: true });
  } catch (error) {
    console.error("Error creating Shopify connection:", error);
    return NextResponse.json({ error: "Failed to connect store" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const session = await auth();
  const demoResponse = getDemoApiResponse(session?.user?.id, req);
  if (demoResponse) return demoResponse;
  const { id: brandId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await hasBrandAccess(session.user.id, brandId);
  if (role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db
      .delete(platformConnections)
      .where(
        and(
          eq(platformConnections.brandId, brandId),
          eq(platformConnections.platform, "shopify")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Shopify connection:", error);
    return NextResponse.json({ error: "Failed to disconnect store" }, { status: 500 });
  }
}
