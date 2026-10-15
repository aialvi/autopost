import { insightsFromMetrics } from "./insights";
import { db } from "@/lib/db";
import {
  brands,
  adCampaigns,
  adDataSnapshots,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  calculateProfitMetrics,
  getDailyProfitData,
  type DateRange,
} from "@/lib/profit/calculations";

export type { DateRange };

export interface Anomaly {
  id: string;
  type: "spend_spike" | "roas_drop" | "ctr_drop" | "conversion_drop" | "unusual_metric";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  value: number;
  expectedValue: number;
  deviation: number;
  date: string;
  entityId?: string;
  entityType?: "campaign" | "ad" | "platform";
  platform?: string;
}

export interface Insight {
  id: string;
  type: "positive" | "negative" | "neutral";
  category: "performance" | "trend" | "opportunity" | "warning";
  title: string;
  description: string;
  metrics: {
    label: string;
    value: number;
    change?: number;
  }[];
  recommendations?: string[];
}

export interface Recommendation {
  id: string;
  actionType: "kill" | "scale" | "watch" | "launch";
  title: string;
  reasoning: string;
  currentMetrics: {
    spend?: number;
    roas?: number;
    ctr?: number;
    conversions?: number;
  };
  recommendedChanges: {
    action?: "increase" | "decrease" | "pause" | "resume";
    targetValue?: number;
    budget?: number;
  };
  entityId?: string;
  entityType?: "campaign" | "ad";
}

/**
 * Calculate statistical mean
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[], meanValue: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - meanValue, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Detect anomalies using z-score analysis
 */
function detectAnomalies(
  dataPoints: Array<{ date: string; value: number }>,
  threshold: number = 2
): Array<{ date: string; value: number; zScore: number }> {
  const values = dataPoints.map((d) => d.value);
  const meanValue = mean(values);
  const sd = stdDev(values, meanValue);

  return dataPoints
    .map((d) => ({
      date: d.date,
      value: d.value,
      zScore: sd === 0 ? 0 : (d.value - meanValue) / sd,
    }))
    .filter((d) => Math.abs(d.zScore) > threshold);
}

/**
 * Generate anomaly analysis for a brand
 */
export async function generateAnomalyAnalysis(
  brandId: string,
  dateRange: DateRange
): Promise<Anomaly[]> {
  const { startDate, endDate } = dateRange;
  const anomalies: Anomaly[] = [];
  const currency = (await db.query.brands.findFirst({ where: eq(brands.id, brandId), columns: { currency: true } }))?.currency ?? "USD";

  // Get daily ad spend data
  const spendData = await db
    .select({
      date: adDataSnapshots.date,
      platform: adDataSnapshots.platform,
      spend: sql<number>`CAST(${adDataSnapshots.spend} AS FLOAT)`,
    })
    .from(adDataSnapshots)
    .where(
      and(
        eq(adDataSnapshots.brandId, brandId),
        gte(adDataSnapshots.date, startDate),
        lte(adDataSnapshots.date, endDate)
      )
    )
    .orderBy(adDataSnapshots.date);

  // Group spend by date and platform
  const spendByDate: Record<string, Record<string, number>> = {};
  for (const row of spendData) {
    if (!spendByDate[row.date]) {
      spendByDate[row.date] = {};
    }
    spendByDate[row.date][row.platform] = (spendByDate[row.date][row.platform] || 0) + parseFloat(row.spend.toString());
  }

  // Detect spend anomalies for each platform
  for (const platform of ["meta", "snapchat", "google", "tiktok"]) {
    const platformData = Object.entries(spendByDate)
      .filter(([, data]) => data[platform] !== undefined)
      .map(([date, data]) => ({ date, value: data[platform] || 0 }));

    if (platformData.length < 3) continue;

    const platformAnomalies = detectAnomalies(platformData, 2);

    for (const anomaly of platformAnomalies) {
      const isSpike = anomaly.zScore > 0;
      anomalies.push({
        id: `spend_${platform}_${anomaly.date}`,
        type: isSpike ? "spend_spike" : "unusual_metric",
        severity: Math.abs(anomaly.zScore) > 3 ? "high" : "medium",
        title: `${isSpike ? "Spend Spike" : "Low Spend"} on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
        description: `${isSpike ? "Unusually high" : "Unusually low"} ad spend of ${currency} ${anomaly.value.toFixed(2)} detected on ${anomaly.date}`,
        value: anomaly.value,
        expectedValue: platformData.reduce((sum, d) => sum + d.value, 0) / platformData.length,
        deviation: anomaly.zScore,
        date: anomaly.date,
        platform,
      });
    }
  }

  // Get campaign-level ROAS anomalies
  const campaignMetrics = await db
    .select({
      campaignId: adCampaigns.id,
      platformCampaignId: adCampaigns.platformCampaignId,
      platform: adCampaigns.platform,
      name: adCampaigns.name,
      date: adDataSnapshots.date,
      spend: sql<number>`CAST(${adDataSnapshots.spend} AS FLOAT)`,
      revenue: adDataSnapshots.revenueReported,
    })
    .from(adCampaigns)
    .innerJoin(adDataSnapshots, eq(adCampaigns.id, adDataSnapshots.campaignId))
    .where(
      and(
        eq(adCampaigns.brandId, brandId),
        gte(adDataSnapshots.date, startDate),
        lte(adDataSnapshots.date, endDate)
      )
    );

  // Calculate ROAS for each campaign per day
  const campaignROAS: Record<string, Array<{ date: string; value: number }>> = {};
  for (const row of campaignMetrics) {
    if (!row.campaignId) continue;
    if (!campaignROAS[row.campaignId]) {
      campaignROAS[row.campaignId] = [];
    }
    const spend = parseFloat(row.spend.toString());
    campaignROAS[row.campaignId].push({
      date: row.date,
      value: spend > 0 ? Number(row.revenue || 0) / spend : 0,
    });
  }

  // Detect ROAS anomalies
  for (const [campaignId, data] of Object.entries(campaignROAS)) {
    if (data.length < 3) continue;

    const roasAnomalies = detectAnomalies(data, 1.5);

    for (const anomaly of roasAnomalies) {
      if (anomaly.zScore < 0) { // Only care about drops
        const campaign = campaignMetrics.find((c) => c.campaignId === campaignId);
        anomalies.push({
          id: `roas_${campaignId}_${anomaly.date}`,
          type: "roas_drop",
          severity: anomaly.zScore < -2.5 ? "high" : "medium",
          title: `ROAS Drop: ${campaign?.name || "Unknown Campaign"}`,
          description: `ROAS dropped to ${anomaly.value.toFixed(2)} on ${anomaly.date}`,
          value: anomaly.value,
          expectedValue: data.reduce((sum, d) => sum + d.value, 0) / data.length,
          deviation: anomaly.zScore,
          date: anomaly.date,
          entityId: campaignId,
          entityType: "campaign",
          platform: campaign?.platform,
        });
      }
    }
  }

  // Sort by severity and date
  anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity] || b.date.localeCompare(a.date);
  });

  return anomalies.slice(0, 20); // Return top 20 anomalies
}

/**
 * Generate insights from profit metrics
 */
export async function generateInsights(
  brandId: string,
  dateRange: DateRange,
  previousDateRange?: DateRange
): Promise<Insight[]> {
  const currentMetrics = await calculateProfitMetrics(brandId, dateRange);
  let previousMetrics = null;

  if (previousDateRange) {
    previousMetrics = await calculateProfitMetrics(brandId, previousDateRange);
  }

  return insightsFromMetrics(currentMetrics, previousMetrics);
}

/**
 * Generate recommendations for ad campaigns
 */
export async function generateRecommendations(
  brandId: string,
  dateRange: DateRange
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const currency = (await db.query.brands.findFirst({ where: eq(brands.id, brandId), columns: { currency: true } }))?.currency ?? "USD";
  const { startDate, endDate } = dateRange;

  // Get campaign performance data
  const campaigns = await db
    .select({
      id: adCampaigns.id,
      platformCampaignId: adCampaigns.platformCampaignId,
      platform: adCampaigns.platform,
      name: adCampaigns.name,
      dailyBudget: adCampaigns.dailyBudget,
      status: adCampaigns.status,
      totalSpend: sql<number>`CAST(SUM(CAST(${adDataSnapshots.spend} AS FLOAT)) AS FLOAT)`,
      totalImpressions: sql<number>`SUM(${adDataSnapshots.impressions})`,
      totalClicks: sql<number>`SUM(${adDataSnapshots.clicks})`,
      totalConversions: sql<number>`SUM(${adDataSnapshots.conversions})`,
      totalRevenue: sql<number>`SUM(${adDataSnapshots.revenueReported})`,
      daysActive: sql<number>`COUNT(DISTINCT ${adDataSnapshots.date})`,
    })
    .from(adCampaigns)
    .innerJoin(adDataSnapshots, eq(adCampaigns.id, adDataSnapshots.campaignId))
    .where(
      and(
        eq(adCampaigns.brandId, brandId),
        gte(adDataSnapshots.date, startDate),
        lte(adDataSnapshots.date, endDate)
      )
    )
    .groupBy(adCampaigns.id, adCampaigns.platformCampaignId, adCampaigns.platform, adCampaigns.name)
    .having(sql`SUM(CAST(${adDataSnapshots.spend} AS FLOAT)) > 0`);

  for (const campaign of campaigns) {
    if (!["active", "enabled", "running"].includes(campaign.status)) continue;
    const spend = parseFloat(campaign.totalSpend?.toString() || "0");
    const clicks = campaign.totalClicks || 0;
    const conversions = campaign.totalConversions || 0;
    const ctr = clicks > 0 && campaign.totalImpressions > 0
      ? (clicks / campaign.totalImpressions) * 100
      : 0;
    const roas = spend > 0 ? Number(campaign.totalRevenue || 0) / spend : 0;

    // Kill recommendation: High spend, low conversions
    if (spend > 500 && conversions < 5) {
      recommendations.push({
        id: `kill_${campaign.id}`,
        actionType: "kill",
        title: `Consider Pausing: ${campaign.name}`,
        reasoning: `This campaign has spent ${currency} ${spend.toFixed(2)} with only ${conversions} conversions. Platform-reported ROAS is ${roas.toFixed(2)}x.`,
        currentMetrics: { spend, roas, ctr, conversions },
        recommendedChanges: { action: "pause" },
        entityId: campaign.id,
        entityType: "campaign",
      });
    }

    // Scale recommendation: Good ROAS, room to grow
    if (roas > 2.5 && spend > 100 && spend < 1000) {
      recommendations.push({
        id: `scale_${campaign.id}`,
        actionType: "scale",
        title: `Scale Up: ${campaign.name}`,
        reasoning: `This campaign shows strong performance with ${roas.toFixed(2)}x ROAS. Consider increasing budget.`,
        currentMetrics: { spend, roas, ctr, conversions },
        recommendedChanges: {
          action: "increase",
          ...(Number(campaign.dailyBudget) > 0 ? { budget: Math.round(Number(campaign.dailyBudget) * 1.2 * 100) / 100 } : {}),
        },
        entityId: campaign.id,
        entityType: "campaign",
      });
    }

    // Watch recommendation: New or unclear performance
    if (spend < 100) {
      recommendations.push({
        id: `watch_${campaign.id}`,
        actionType: "watch",
        title: `Monitor: ${campaign.name}`,
        reasoning: `This campaign has low spend (${currency} ${spend.toFixed(2)}). Collect more data before making decisions.`,
        currentMetrics: { spend, roas, ctr, conversions },
        recommendedChanges: {},
        entityId: campaign.id,
        entityType: "campaign",
      });
    }
  }

  return recommendations.slice(0, 10); // Return top 10 recommendations
}

/**
 * Generate trend analysis
 */
export async function generateTrendAnalysis(
  brandId: string,
  dateRange: DateRange
): Promise<{
  trend: "growing" | "stable" | "declining";
  growthRate: number;
  forecast: Array<{ date: string; projected: number; confidence: "high" | "medium" | "low" }>;
}> {
  const dailyData = await getDailyProfitData(brandId, dateRange);

  if (dailyData.length < 7 || !dailyData.some(day => day.metrics.orders > 0)) {
    return {
      trend: "stable",
      growthRate: 0,
      forecast: [],
    };
  }

  // Calculate linear regression for trend
  const n = dailyData.length;
  const xValues = dailyData.map((_, i) => i);
  const yValues = dailyData.map((d) => d.metrics.revenue);

  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Determine trend
  const avgRevenue = sumY / n;
  const growthRate = avgRevenue > 0 ? (slope / avgRevenue) * 100 : 0;

  let trend: "growing" | "stable" | "declining";
  if (growthRate > 2) {
    trend = "growing";
  } else if (growthRate < -2) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  // Generate simple forecast for next 7 days
  const lastDate = new Date(dailyData[dailyData.length - 1].date);
  const forecast = [];
  const variance = yValues.reduce((sum, y, index) => {
    const predicted = slope * index + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0) / n;

  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setUTCDate(futureDate.getUTCDate() + i);
    const projected = slope * (n + i - 1) + intercept;

    let confidence: "high" | "medium" | "low";
    const cv = Math.sqrt(variance) / Math.abs(projected);
    if (cv < 0.1) confidence = "high";
    else if (cv < 0.25) confidence = "medium";
    else confidence = "low";

    forecast.push({
      date: futureDate.toISOString().split("T")[0],
      projected: Math.max(0, projected),
      confidence,
    });
  }

  return {
    trend,
    growthRate,
    forecast,
  };
}
