import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasBrandAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { capiEvents } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get CAPI events for a brand
 */
export async function GET(
  req: Request,
  { params }: RouteContext
) {
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
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");
    const limit = parseInt(searchParams.get("limit") || "50");

    const events = await db.query.capiEvents.findMany({
      where: platform
        ? and(eq(capiEvents.brandId, brandId), eq(capiEvents.platform, platform as any))
        : eq(capiEvents.brandId, brandId),
      orderBy: [desc(capiEvents.createdAt)],
      limit,
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching CAPI events:", error);
    return NextResponse.json(
      { error: "Failed to fetch CAPI events" },
      { status: 500 }
    );
  }
}
