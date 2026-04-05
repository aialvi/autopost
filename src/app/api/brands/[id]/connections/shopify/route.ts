import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformConnections } from "@/lib/db/schema";
import { hasBrandAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ShopifyClient } from "@/lib/platforms/shopify";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();
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
    const { accessToken, ...safeConnection } = connection;
    return NextResponse.json({ connected: true, connection: safeConnection });
  } catch (error) {
    console.error("Error fetching Shopify connection:", error);
    return NextResponse.json({ error: "Failed to fetch connection" }, { status: 500 });
  }
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
    const { storeDomain, accessToken } = body;

    if (!storeDomain || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate credentials by making a test request
    const client = new ShopifyClient({ storeDomain, accessToken });
    try {
      await client.getShop();
    } catch (error) {
      return NextResponse.json({ error: "Invalid Shopify credentials" }, { status: 400 });
    }

    // Check for existing connection
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.platform, "shopify")
      ),
    });

    if (existing) {
      // Update existing connection
      await db
        .update(platformConnections)
        .set({
          accountId: storeDomain,
          accessToken,
          status: "active",
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
          metadata: { myshopifyDomain: storeDomain },
        })
        .where(eq(platformConnections.id, existing.id));
    } else {
      // Create new connection
      await db.insert(platformConnections).values({
        brandId,
        platform: "shopify",
        accountId: storeDomain,
        accessToken,
        status: "active",
        lastSyncedAt: new Date(),
        metadata: { myshopifyDomain: storeDomain },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating Shopify connection:", error);
    return NextResponse.json({ error: "Failed to connect store" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const session = await auth();
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
