import { DateRangeError, getDates } from "@/lib/profit/metrics";
import { getDemoApiResponse } from "@/lib/demo/api";
import { auth } from "@/lib/auth";
import { hasBrandAccess } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  calculateProfitMetrics,
  getDailyProfitData,
  getWeeklyProfitData,
  getMonthlyProfitData,
  getPlatformProfitBreakdown,
  type DateRange,
} from "@/lib/profit/calculations";

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
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const granularity = searchParams.get("granularity") || "overall"; // overall, daily, weekly, monthly
    const includeBreakdown = searchParams.get("includeBreakdown") === "true";

    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 29);

    const dateRange: DateRange = {
      startDate: startDate || defaultStartDate.toISOString().split("T")[0],
      endDate: endDate || defaultEndDate.toISOString().split("T")[0],
    };

    getDates(dateRange);
    if (!["overall", "daily", "weekly", "monthly"].includes(granularity)) return NextResponse.json({ error: "Invalid granularity" }, { status: 400 });
    let data;

    switch (granularity) {
      case "daily":
        data = await getDailyProfitData(brandId, dateRange);
        break;
      case "weekly":
        data = await getWeeklyProfitData(brandId, dateRange);
        break;
      case "monthly":
        data = await getMonthlyProfitData(brandId, dateRange);
        break;
      default:
        data = await calculateProfitMetrics(brandId, dateRange);
    }

    const response: Record<string, unknown> = {
      dateRange,
      granularity,
      data,
    };

    if (includeBreakdown) {
      response.breakdown = await getPlatformProfitBreakdown(brandId, dateRange);
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof DateRangeError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error fetching profit data:", error);
    return NextResponse.json(
      { error: "Failed to fetch profit data" },
      { status: 500 }
    );
  }
}
