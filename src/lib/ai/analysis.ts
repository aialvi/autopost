import { db } from "@/lib/db";
import {
  adCampaigns,
  ads,
  adDataSnapshots,
  shopifyOrders,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
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
    action: "increase" | "decrease" | "pause" | "resume";
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
      .filter(([_, data]) => data[platform])
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
        description: `${isSpike ? "Unusually high" : "Unusually low"} ad spend of $${anomaly.value.toFixed(2)} detected on ${anomaly.date}`,
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
      conversions: adDataSnapshots.conversions,
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
    // ROAS = revenue / spend. Since we don't have direct revenue, we'll use conversions as proxy
    // A drop in conversions relative to spend is the anomaly
    const spend = parseFloat(row.spend.toString());
    campaignROAS[row.campaignId].push({
      date: row.date,
      value: spend > 0 ? (row.conversions || 0) / spend : 0,
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
  const insights: Insight[] = [];

  const currentMetrics = await calculateProfitMetrics(brandId, dateRange);
  let previousMetrics = null;

  if (previousDateRange) {
    previousMetrics = await calculateProfitMetrics(brandId, previousDateRange);
  }

  // Revenue trend insight
  const revenueChange = previousMetrics
    ? ((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue) * 100
    : 0;

  if (revenueChange > 10) {
    insights.push({
      id: "revenue_growth",
      type: "positive",
      category: "trend",
      title: "Revenue Growth",
      description: `Revenue is up ${revenueChange.toFixed(1)}% compared to the previous period`,
      metrics: [
        { label: "Current Revenue", value: currentMetrics.revenue },
        { label: "Change", value: revenueChange },
      ],
      recommendations: ["Consider scaling successful ad campaigns", "Analyze what drove the growth"],
    });
  } else if (revenueChange < -10) {
    insights.push({
      id: "revenue_decline",
      type: "negative",
      category: "warning",
      title: "Revenue Decline",
      description: `Revenue is down ${Math.abs(revenueChange).toFixed(1)}% compared to the previous period`,
      metrics: [
        { label: "Current Revenue", value: currentMetrics.revenue },
        { label: "Change", value: revenueChange },
      ],
      recommendations: [
        "Review underperforming campaigns",
        "Check for seasonal factors",
        "Analyze conversion rate changes",
      ],
    });
  }

  // ROAS insight
  if (currentMetrics.roas < 1) {
    insights.push({
      id: "low_roas",
      type: "negative",
      category: "performance",
      title: "Low ROAS Detected",
      description: `Return on ad spend is ${currentMetrics.roas.toFixed(2)}x, below the break-even point`,
      metrics: [
        { label: "ROAS", value: currentMetrics.roas },
        { label: "Ad Spend", value: currentMetrics.adSpend },
        { label: "Revenue", value: currentMetrics.revenue },
      ],
      recommendations: [
        "Pause or kill low-performing campaigns",
        "Optimize ad creatives and targeting",
        "Review bidding strategy",
      ],
    });
  } else if (currentMetrics.roas > 3) {
    insights.push({
      id: "high_roas",
      type: "positive",
      category: "performance",
      title: "Strong ROAS",
      description: `Return on ad spend is ${currentMetrics.roas.toFixed(2)}x, indicating strong performance`,
      metrics: [
        { label: "ROAS", value: currentMetrics.roas },
        { label: "Ad Spend", value: currentMetrics.adSpend },
        { label: "Revenue", value: currentMetrics.revenue },
      ],
      recommendations: [
        "Consider scaling budget on top campaigns",
        "Test similar audiences and creatives",
        "Monitor for saturation",
      ],
    });
  }

  // Profit margin insight
  if (currentMetrics.profitMargin < 10) {
    insights.push({
      id: "low_margin",
      type: "negative",
      category: "warning",
      title: "Low Profit Margin",
      description: `Profit margin is ${currentMetrics.profitMargin.toFixed(1)}%, indicating tight margins`,
      metrics: [
        { label: "Profit Margin", value: currentMetrics.profitMargin },
        { label: "Net Profit", value: currentMetrics.netProfit },
      ],
      recommendations: [
        "Review COGS and find cost savings",
        "Increase prices if market allows",
        "Focus on higher-margin products",
        "Optimize ad spend efficiency",
      ],
    });
  }

  // AOV insight
  if (previousMetrics && currentMetrics.aov > previousMetrics.aov * 1.1) {
    insights.push({
      id: "aov_increase",
      type: "positive",
      category: "opportunity",
      title: "AOV Increased",
      description: `Average order value increased by ${((currentMetrics.aov - previousMetrics.aov) / previousMetrics.aov * 100).toFixed(1)}%`,
      metrics: [
        { label: "AOV", value: currentMetrics.aov, change: currentMetrics.aov - previousMetrics.aov },
      ],
      recommendations: [
        "Analyze what drove higher AOV",
        "Create bundles to maintain high AOV",
        "Upsell strategies are working well",
      ],
    });
  }

  // Ad spend percentage insight
  const adSpendPercentage = (currentMetrics.adSpend / currentMetrics.revenue) * 100;
  if (adSpendPercentage > 40) {
    insights.push({
      id: "high_ad_spend",
      type: "negative",
      category: "warning",
      title: "High Ad Spend Ratio",
      description: `Ad spend represents ${adSpendPercentage.toFixed(1)}% of revenue`,
      metrics: [
        { label: "Ad Spend %", value: adSpendPercentage },
        { label: "Ad Spend", value: currentMetrics.adSpend },
        { label: "Revenue", value: currentMetrics.revenue },
      ],
      recommendations: [
        "Focus on improving organic conversion rate",
        "Optimize ad targeting to reduce waste",
        "Improve landing page conversion",
      ],
    });
  }

  return insights;
}

/**
 * Generate recommendations for ad campaigns
 */
export async function generateRecommendations(
  brandId: string,
  dateRange: DateRange
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const { startDate, endDate } = dateRange;

  // Get campaign performance data
  const campaigns = await db
    .select({
      id: adCampaigns.id,
      platformCampaignId: adCampaigns.platformCampaignId,
      platform: adCampaigns.platform,
      name: adCampaigns.name,
      totalSpend: sql<number>`CAST(SUM(CAST(${adDataSnapshots.spend} AS FLOAT)) AS FLOAT)`,
      totalImpressions: sql<number>`SUM(${adDataSnapshots.impressions})`,
      totalClicks: sql<number>`SUM(${adDataSnapshots.clicks})`,
      totalConversions: sql<number>`SUM(${adDataSnapshots.conversions})`,
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
    const spend = parseFloat(campaign.totalSpend?.toString() || "0");
    const clicks = campaign.totalClicks || 0;
    const conversions = campaign.totalConversions || 0;
    const ctr = clicks > 0 && campaign.totalImpressions > 0
      ? (clicks / campaign.totalImpressions) * 100
      : 0;
    const roas = spend > 0 ? (conversions * 50) / spend : 0; // Assuming $50 per conversion for ROAS calc

    // Kill recommendation: High spend, low conversions
    if (spend > 500 && conversions < 5) {
      recommendations.push({
        id: `kill_${campaign.id}`,
        actionType: "kill",
        title: `Consider Pausing: ${campaign.name}`,
        reasoning: `This campaign has spent $${spend.toFixed(2)} with only ${conversions} conversions. ROAS is estimated at ${roas.toFixed(2)}x.`,
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
          budget: spend * 1.5,
          targetValue: conversions * 1.5,
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
        reasoning: `This campaign has low spend ($${spend.toFixed(2)}). Collect more data before making decisions.`,
        currentMetrics: { spend, roas, ctr, conversions },
        recommendedChanges: { action: "resume" },
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

  if (dailyData.length < 7) {
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
  const variance = yValues.reduce((sum, y) => {
    const predicted = slope * (yValues.indexOf(y)) + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0) / n;

  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
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
