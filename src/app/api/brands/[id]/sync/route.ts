import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformConnections } from "@/lib/db/schema";
import { hasBrandAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { syncAdData, logSync, type AdPlatformConfig } from "@/lib/platforms/ads/sync";

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
    const { platform, date } = body;

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    const validPlatforms = ["meta", "snapchat", "google", "tiktok"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Get the connection
    const connection = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.platform, platform)
      ),
    });

    if (!connection) {
      return NextResponse.json({ error: "No connection found for this platform" }, { status: 404 });
    }

    if (connection.status !== "active") {
      return NextResponse.json({ error: "Connection is not active" }, { status: 400 });
    }

    // Build config based on platform
    const config: AdPlatformConfig = {
      platform: platform as AdPlatformConfig["platform"],
      accessToken: connection.accessToken,
      accountId: connection.accountId,
      refreshToken: connection.refreshToken || undefined,
    };

    // Add platform-specific config from metadata
    if (connection.metadata) {
      if (connection.metadata.clientId) config.clientId = connection.metadata.clientId;
      if (connection.metadata.clientSecret) config.clientSecret = connection.metadata.clientSecret;
      if (connection.metadata.developerToken) config.developerToken = connection.metadata.developerToken;
      if (connection.metadata.customerId) config.customerId = connection.metadata.customerId;
      if (connection.metadata.appId) config.appId = connection.metadata.appId;
      if (connection.metadata.appSecret) config.appSecret = connection.metadata.appSecret;
    }

    // Use today's date if not provided
    const syncDate = date || new Date().toISOString().split("T")[0];

    // Log sync started
    await logSync(brandId, platform, "ad_data", "started", 0);

    // Perform sync
    const result = await syncAdData(brandId, config, syncDate);

    // Log sync completed
    const totalRecords = result.campaigns + result.adSets + result.ads + result.snapshots;
    const status = result.errors > 0 ? "partial" : "success";
    await logSync(brandId, platform, "ad_data", status, totalRecords);

    return NextResponse.json({
      success: true,
      result: {
        campaigns: result.campaigns,
        adSets: result.adSets,
        ads: result.ads,
        snapshots: result.snapshots,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("Error syncing ad data:", error);

    // Try to log the failure
    try {
      const body = await req.json().catch(() => ({}));
      await logSync(
        brandId,
        body.platform || "unknown",
        "ad_data",
        "failed",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: "Failed to sync ad data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
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
    // Get all platform connections for this brand
    const connections = await db.query.platformConnections.findMany({
      where: eq(platformConnections.brandId, brandId),
    });

    const adPlatforms = connections.filter((c) =>
      ["meta", "snapchat", "google", "tiktok"].includes(c.platform)
    );

    return NextResponse.json({
      connections: adPlatforms.map((c) => ({
        platform: c.platform,
        status: c.status,
        lastSyncedAt: c.lastSyncedAt,
        accountId: c.accountId,
      })),
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json({ error: "Failed to fetch sync status" }, { status: 500 });
  }
}
