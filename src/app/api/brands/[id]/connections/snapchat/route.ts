import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformConnections } from "@/lib/db/schema";
import { hasBrandAccess } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { SnapchatClient } from "@/lib/platforms/snapchat/client";

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
        eq(platformConnections.platform, "snapchat")
      ),
    });

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Don't expose the full access token
    const { accessToken, ...safeConnection } = connection;
    return NextResponse.json({ connected: true, connection: safeConnection });
  } catch (error) {
    console.error("Error fetching Snapchat connection:", error);
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
    const { clientId, clientSecret, accessToken, refreshToken } = body;

    if (!clientId || !clientSecret || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate credentials by making a test request
    const client = new SnapchatClient({ clientId, clientSecret, accessToken, refreshToken });
    try {
      const campaigns = await client.getCampaigns();
      // If we get here, credentials are valid
    } catch (error) {
      return NextResponse.json({ error: "Invalid Snapchat credentials" }, { status: 400 });
    }

    // Check for existing connection
    const existing = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.brandId, brandId),
        eq(platformConnections.platform, "snapchat")
      ),
    });

    const metadata: Record<string, string> = { clientId, clientSecret };
    if (refreshToken) {
      metadata.refreshToken = refreshToken;
    }

    if (existing) {
      // Update existing connection
      await db
        .update(platformConnections)
        .set({
          accountId: clientId,
          accessToken,
          refreshToken,
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
        platform: "snapchat",
        accountId: clientId,
        accessToken,
        refreshToken,
        status: "active",
        lastSyncedAt: new Date(),
        metadata,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating Snapchat connection:", error);
    return NextResponse.json({ error: "Failed to connect account" }, { status: 500 });
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
          eq(platformConnections.platform, "snapchat")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Snapchat connection:", error);
    return NextResponse.json({ error: "Failed to disconnect account" }, { status: 500 });
  }
}
