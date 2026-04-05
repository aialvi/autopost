import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasBrandAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get notification preferences for a brand
 */
export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: brandId } = await params;

  const role = await hasBrandAccess(session.user.id, brandId);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get preferences for this user/brand combination
    const prefs = await db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.brandId, brandId),
        eq(notificationPreferences.userId, session.user.id)
      ),
    });

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update notification preferences
 */
export async function PUT(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: brandId } = await params;

  const role = await hasBrandAccess(session.user.id, brandId);
  if (role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Check if preferences exist
    const existing = await db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.brandId, brandId),
        eq(notificationPreferences.userId, session.user.id)
      ),
    });

    if (existing) {
      // Update existing
      await db
        .update(notificationPreferences)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.id, existing.id));
    } else {
      // Create new
      await db.insert(notificationPreferences).values({
        ...body,
        brandId,
        userId: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove notification preferences
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: brandId } = await params;

  const role = await hasBrandAccess(session.user.id, brandId);
  if (role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db
      .delete(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.brandId, brandId),
          eq(notificationPreferences.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to delete notification preferences" },
      { status: 500 }
    );
  }
}
