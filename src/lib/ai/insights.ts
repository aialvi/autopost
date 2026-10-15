import type { ProfitMetrics } from "@/lib/profit/metrics";
import type { Insight } from "./analysis";

export function insightsFromMetrics(currentMetrics: ProfitMetrics, previousMetrics: ProfitMetrics | null = null): Insight[] {
  const insights: Insight[] = [];
  // Revenue trend insight
  const revenueChange = previousMetrics && previousMetrics.revenue > 0
    ? ((currentMetrics.revenue - previousMetrics.revenue) / (previousMetrics.revenue || 1)) * 100
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
  if (currentMetrics.adSpend > 0 && currentMetrics.roas < 1) {
    insights.push({
      id: "low_roas",
      type: "negative",
      category: "performance",
      title: "Low ROAS Detected",
      description: `Return on ad spend is ${currentMetrics.roas.toFixed(2)}x, below 1x before product costs and expenses`,
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
  if (currentMetrics.revenue > 0 && currentMetrics.profitMargin < 10) {
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
  if (previousMetrics && previousMetrics.aov > 0 && currentMetrics.aov > previousMetrics.aov * 1.1) {
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
  const adSpendPercentage = currentMetrics.revenue > 0 ? (currentMetrics.adSpend / currentMetrics.revenue) * 100 : 0;
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

