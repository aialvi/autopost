import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasBrandAccess } from "@/lib/auth";
import { getBrandAttribution } from "@/lib/attribution/tracking";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get attribution data for a brand
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
    const startDate = searchParams.get("startDate") || getStartDate(30);
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
    const model = (searchParams.get("model") || "last_click") as
      | "first_click"
      | "last_click"
      | "linear"
      | "time_decay"
      | "position_based";

    const attribution = await getBrandAttribution(brandId, startDate, endDate, model);

    return NextResponse.json({
      dateRange: { startDate, endDate },
      model,
      ...attribution,
    });
  } catch (error) {
    console.error("Error fetching attribution data:", error);
    return NextResponse.json(
      { error: "Failed to fetch attribution data" },
      { status: 500 }
    );
  }
}

function getStartDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().split("T")[0];
}
