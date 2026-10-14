import { protectSecret, safeConnection } from "@/lib/platforms/connection-secrets";
import { getDemoApiResponse } from "@/lib/demo/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformConnections } from "@/lib/db/schema";
import { hasBrandAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { TikTokClient } from "@/lib/platforms/tiktok/client";

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
        eq(platformConnections.platform, "tiktok")
      ),
    });

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Don't expose the full access token or app secret
    return NextResponse.json({ connected: true, connection: safeConnection(connection) });
  } catch (error) {
    console.error("Error fetching TikTok connection:", error);
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
    const { appId, appSecret, accessToken, accountId } = body;

    if (!appId || !appSecret || !accessToken || !accountId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate credentials by making a test request
    const client = new TikTokClient({ appId, appSecret, accessToken });
    try {
      const accounts = await client.getAdAccounts();
      if (!accounts.some((account) => String(account.advertiser_id) === String(accountId))) {
        return NextResponse.json({ error: "No ad accounts found" }, { status: 400 });
      }
      // If we get here, credentials are valid
    } catch (error) {
      return NextResponse.json({ error: "Invalid TikTok credentials" }, { status: 400 });
    }

    // Check for existing connection
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.platform, "tiktok")
      ),
    });


    const metadata = {
      appId,
      appSecret: protectSecret(appSecret),
    };

    if (existing) {
      // Update existing connection
      await db
        .update(platformConnections)
        .set({
          accountId,
          accessToken: protectSecret(accessToken),
          status: "active",
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
          metadata,
        })
        .where(eq(platformConnections.id, existing.id));
    } else {
      // Create new connection
      await db.insert(platformConnections).values({
        brandId,
        platform: "tiktok",
        accountId,
        accessToken: protectSecret(accessToken),
        status: "active",
        lastSyncedAt: new Date(),
        metadata,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating TikTok connection:", error);
    return NextResponse.json({ error: "Failed to connect account" }, { status: 500 });
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
          eq(platformConnections.platform, "tiktok")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting TikTok connection:", error);
    return NextResponse.json({ error: "Failed to disconnect account" }, { status: 500 });
  }
}
