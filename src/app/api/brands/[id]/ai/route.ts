import { DateRangeError, previousPeriod } from "@/lib/profit/metrics";
import { enhanceRecommendations } from "@/lib/ai/provider";
import { calculateProfitMetrics } from "@/lib/profit/calculations";
import { getDemoApiResponse } from "@/lib/demo/api";
import { auth } from "@/lib/auth";
import { hasBrandAccess } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  generateAnomalyAnalysis,
  generateInsights,
  generateRecommendations,
  generateTrendAnalysis,
  type DateRange,
} from "@/lib/ai/analysis";

export const maxDuration = 120;

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
    const type = searchParams.get("type") || "all"; // all, anomalies, insights, recommendations, trends

    // Default to last 30 days
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 29);

    const dateRange: DateRange = {
      startDate: startDate || defaultStartDate.toISOString().split("T")[0],
      endDate: endDate || defaultEndDate.toISOString().split("T")[0],
    };

    if (!["all", "anomalies", "insights", "recommendations", "trends"].includes(type)) return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 });
    const previousDateRange = previousPeriod(dateRange);

    const result: Record<string, unknown> = {
      dateRange,
    };

    if (type === "all" || type === "anomalies") {
      result.anomalies = await generateAnomalyAnalysis(brandId, dateRange);
    }

    if (type === "all" || type === "insights") {
      result.insights = await generateInsights(brandId, dateRange, previousDateRange);
    }

    if (type === "all" || type === "recommendations") {
      const baseline = await generateRecommendations(brandId, dateRange);
      Object.assign(result, await enhanceRecommendations(await calculateProfitMetrics(brandId, dateRange), baseline));
    }

    if (type === "all" || type === "trends") {
      result.trends = await generateTrendAnalysis(brandId, dateRange);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DateRangeError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Error generating AI analysis:", error);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }
}
