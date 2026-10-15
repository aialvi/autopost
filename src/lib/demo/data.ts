import { DEMO_BRAND_IDS } from "./config";
import type { DashboardOverview } from "@/lib/dashboard/overview";
import type { ProfitMetrics } from "@/components/dashboard/profit-metrics-card";
import type { NotificationPreferences } from "@/components/notifications/notification-preferences";
import type { SubscriptionDetails } from "@/lib/payments/management";
import type { Anomaly, Insight, Recommendation } from "@/lib/ai/analysis";
import type { TrendData } from "@/components/ai/trend-analysis";

const DAY = 86_400_000;
const names = ["Northstar Apparel", "Terra Home", "Bloom Skincare"];
const scales = [1, 0.72, 1.28];
const platforms = ["meta", "google", "tiktok", "snapchat"] as const;
const campaigns = ["Everyday essentials · Retargeting", "Brand search · Best sellers", "Creator collection · Prospecting", "Weekend discovery · New arrivals"];
const round = (value: number) => Math.round(value * 100) / 100;
const dateString = (date: Date) => date.toISOString().slice(0, 10);
const dayStart = (now = new Date()) => new Date(`${dateString(now)}T00:00:00Z`);
const scaleFor = (brandId: string) => scales[DEMO_BRAND_IDS.findIndex((id) => id === brandId)] ?? 1;

export function getDemoBrands(now = new Date()) {
  return DEMO_BRAND_IDS.map((id, index) => ({
    id, name: names[index], slug: names[index].toLowerCase().replaceAll(" ", "-"),
    timezone: "America/New_York", currency: "USD", defaultCogsPercentage: "28.00",
    createdAt: new Date(now.getTime() - 180 * DAY), updatedAt: now,
    userRole: "viewer" as const,
  }));
}

function metricsFor(revenue: number, adSpend: number, orders: number): ProfitMetrics {
  const cogs = round(revenue * 0.28);
  const transactionFees = round(revenue * 0.029 + orders * 0.3);
  const customExpenses = round(revenue * 0.065);
  const totalCost = round(cogs + transactionFees + adSpend + customExpenses);
  const netProfit = round(revenue - totalCost);
  return {
    revenue, cogs, transactionFees, adSpend, customExpenses, totalCost,
    grossProfit: round(revenue - cogs), netProfit, orders,
    roi: totalCost ? round(netProfit / totalCost * 100) : 0,
    roas: adSpend ? round(revenue / adSpend) : 0,
    aov: orders ? round(revenue / orders) : 0,
    profitMargin: revenue ? round(netProfit / revenue * 100) : 0,
  };
}

export function getDemoDailyProfit(brandId: string, startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || (end - start) / DAY > 365) {
    throw new Error("Choose a valid date range of up to one year.");
  }
  const scale = scaleFor(brandId);
  return Array.from({ length: Math.floor((end - start) / DAY) + 1 }, (_, index) => {
    const day = (start + index * DAY) / DAY;
    const orders = Math.round((42 + 9 * Math.sin(day / 3) + 6 * Math.cos(day / 7)) * scale);
    const revenue = round(orders * (87 + 5 * Math.sin(day / 5)));
    const adSpend = round(revenue * (0.21 + 0.035 * Math.cos(day / 4)));
    return { date: dateString(new Date(start + index * DAY)), metrics: metricsFor(revenue, adSpend, orders) };
  });
}

export function getDemoProfit(brandId: string, startDate: string, endDate: string, granularity = "daily") {
  const daily = getDemoDailyProfit(brandId, startDate, endDate);
  const aggregate = (rows: typeof daily) => metricsFor(
    round(rows.reduce((sum, row) => sum + row.metrics.revenue, 0)),
    round(rows.reduce((sum, row) => sum + row.metrics.adSpend, 0)),
    rows.reduce((sum, row) => sum + row.metrics.orders, 0),
  );
  const metrics = aggregate(daily);
  const grouped = new Map<string, typeof daily>();
  for (const row of daily) {
    const date = new Date(`${row.date}T00:00:00Z`);
    if (granularity === "weekly") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    if (granularity === "monthly") date.setUTCDate(1);
    const key = dateString(date);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  const weights = [0.42, 0.30, 0.18, 0.10];
  const revenueWeights = [0.46, 0.31, 0.16, 0.07];
  const breakdown = Object.fromEntries(platforms.map((platform, index) => {
    const spend = round(metrics.adSpend * weights[index]);
    const revenue = round(metrics.revenue * revenueWeights[index]);
    return [platform, { spend, revenue, roas: spend ? round(revenue / spend) : 0 }];
  }));
  return {
    dateRange: { startDate, endDate }, granularity,
    data: granularity === "overall" ? metrics : [...grouped].map(([date, rows]) => ({ date, metrics: aggregate(rows) })),
    breakdown,
  };
}

export function getDemoOverview(brandId: string, now = new Date()): DashboardOverview {
  const today = dateString(now);
  const stats = getDemoDailyProfit(brandId, today, today)[0].metrics;
  const start = dateString(new Date(now.getTime() - 6 * DAY));
  const { breakdown } = getDemoProfit(brandId, start, today);
  return {
    connections: { shopify: true, meta: true, snapchat: true, google: true, tiktok: true },
    quickStats: { todayRevenue: stats.revenue, todayOrders: stats.orders, todayAdSpend: stats.adSpend, activeCampaigns: 12 },
    topCampaigns: platforms.map((platform, index) => ({
      id: `${brandId}-${platform}`, name: campaigns[index], platform,
      spend: breakdown[platform].spend, roas: breakdown[platform].roas, status: "active",
    })),
    recentActivity: [
      { type: "order", message: "Shopify order #1048 paid · Everyday essentials bundle", timestamp: new Date(now.getTime() - 8 * 60_000) },
      { type: "sync", message: "All five sample integrations are up to date", timestamp: new Date(now.getTime() - 22 * 60_000) },
      { type: "alert", message: "Snapchat prospecting spend is above its usual range", timestamp: new Date(now.getTime() - 75 * 60_000) },
    ],
  };
}

export function getDemoComparison(brandIds: string[], now = new Date()) {
  const end = dateString(now);
  const start = dateString(new Date(now.getTime() - 29 * DAY));
  return brandIds.map((brandId) => ({
    brandId, currency: "USD", brandName: getDemoBrands(now).find((brand) => brand.id === brandId)?.name ?? "Demo brand",
    metrics: getDemoProfit(brandId, start, end, "overall").data as ProfitMetrics,
  }));
}

export function getDemoAI(brandId: string, now = new Date()) {
  const scale = scaleFor(brandId);
  const anomalies: Anomaly[] = [
    { id: "spend", type: "spend_spike", severity: "high", title: "Snapchat spend increased 38%", description: "Prospecting spend rose faster than conversions. Review creative frequency and audience overlap.", value: 276, expectedValue: 200, deviation: 38, date: dateString(now), platform: "snapchat" },
    { id: "roas", type: "roas_drop", severity: "medium", title: "TikTok ROAS softened", description: "Return on ad spend fell from 4.2x to 3.6x over the last three days.", value: 3.6, expectedValue: 4.2, deviation: -14.3, date: dateString(new Date(now.getTime() - DAY)), platform: "tiktok" },
  ];
  const insights: Insight[] = [
    { id: "growth", type: "positive", category: "performance", title: "Revenue is growing while profit stays healthy", description: "Shopify revenue is up 18.4% compared with the previous period. Returning customers are driving repeat purchases.", metrics: [{ label: "Revenue growth", value: 18.4, change: 18.4 }, { label: "Profit margin", value: 39.2, change: 3.1 }], recommendations: ["Maintain stock for the top three selling products.", "Expand the returning-customer audience in Meta."] },
    { id: "search", type: "positive", category: "opportunity", title: "Google brand search has room to grow", description: "High-intent search campaigns deliver the strongest return in this sample workspace.", metrics: [{ label: "ROAS", value: 5.8, change: 12.6 }], recommendations: ["Test a 15% budget increase over the next week."] },
    { id: "creative", type: "neutral", category: "warning", title: "Refresh prospecting creative", description: "Snapchat and TikTok audiences have seen the current creative frequently. Prepare new product demonstrations.", metrics: [{ label: "Frequency", value: 4.8, change: 21 }] },
  ];
  const recommendations: Recommendation[] = [
    { id: "scale", actionType: "scale", title: "Increase Meta retargeting budget", reasoning: "Retargeting is profitable with consistent conversions and a low frequency.", currentMetrics: { spend: round(420 * scale), roas: 5.4, ctr: 2.8, conversions: 24 }, recommendedChanges: { action: "increase", budget: round(480 * scale), targetValue: 15 } },
    { id: "watch", actionType: "watch", title: "Monitor TikTok creator campaign", reasoning: "Conversions are growing, but rising acquisition costs need another few days of observation.", currentMetrics: { spend: round(185 * scale), roas: 3.6, ctr: 1.9, conversions: 9 }, recommendedChanges: { action: "resume" } },
    { id: "pause", actionType: "kill", title: "Pause fatigued Snapchat creative", reasoning: "This creative has a low return and high frequency. Replace it with a fresh product story.", currentMetrics: { spend: round(86 * scale), roas: 0.8, ctr: 0.6, conversions: 1 }, recommendedChanges: { action: "pause" } },
  ];
  const trends: TrendData = { trend: "growing", growthRate: 18.4, forecast: Array.from({ length: 7 }, (_, index) => ({ date: dateString(new Date(now.getTime() + (index + 1) * DAY)), projected: round((3650 + index * 115) * scale), confidence: index < 3 ? "high" : index < 5 ? "medium" : "low" })) };
  return { anomalies, insights, recommendations, trends };
}

export function getDemoPreferences(): NotificationPreferences {
  return { enabled: true, telegramChatId: "demo-chat-preview", alertOnLowRoas: true, alertOnSpendSpike: true, alertOnRevenueDrop: true, alertOnNewOrder: true, alertOnDailySummary: true, alertOnWeeklySummary: true, lowRoasThreshold: "1.5", spendSpikeThreshold: "30", revenueDropThreshold: "20", quietHoursStart: "22:00", quietHoursEnd: "07:00", timezone: "America/New_York" };
}

export function getDemoNotifications(now = new Date()) {
  const examples = [
    ["daily_summary", "Daily performance summary", "Revenue $3,842 · 44 orders · net profit $1,507. Meta and Google lead today’s results."],
    ["low_roas", "Snapchat campaign needs attention", "Weekend discovery fell below the 1.5x ROAS threshold. Review its creative and budget."],
    ["new_order", "New Shopify order #1048", "Everyday essentials bundle purchased for $129.00."],
    ["weekly_summary", "Your weekly growth report", "Revenue increased 18.4% this week. All five sample integrations are connected."],
    ["spend_spike", "TikTok spend alert", "Creator collection spent 32% more than its recent daily average."],
  ];
  return Array.from({ length: 45 }, (_, index) => {
    const [type, title, message] = examples[index % examples.length];
    return { id: `demo-notification-${index}`, type, title, message, channel: "telegram", status: index === 4 ? "failed" : "sent", error: index === 4 ? "Sample delivery timeout" : undefined, sentAt: new Date(now.getTime() - (index * 180 + 15) * 60_000) };
  });
}

export function getDemoSubscription(now = new Date()): SubscriptionDetails {
  return { id: "demo-subscription", tier: "pro", status: "active", currency: "USD", amount: 99, currentPeriodStart: new Date(dayStart(now).getTime() - 10 * DAY), currentPeriodEnd: new Date(dayStart(now).getTime() + 20 * DAY), trialStart: null, trialEnd: null, cancelAtPeriodEnd: false, canceledAt: null, polarSubscriptionId: null };
}

export function getDemoInvoices(now = new Date()) {
  return Array.from({ length: 6 }, (_, index) => ({ id: `demo-invoice-${index}`, status: "paid", currency: "USD", subtotal: 99, tax: 0, total: 99, dueDate: null, paidAt: new Date(now.getTime() - (10 + index * 30) * DAY), description: "AutoPost Pro · Sample monthly subscription", polarInvoiceUrl: null, createdAt: new Date(now.getTime() - (10 + index * 30) * DAY) }));
}

export function getDemoCapiEvents(now = new Date()) {
  return Array.from({ length: 24 }, (_, index) => ({ id: `demo-capi-${index}`, platform: platforms[index % 4], eventName: index % 3 === 0 ? "AddToCart" : "Purchase", eventId: `sample-event-${1000 + index}`, sentAt: new Date(now.getTime() - (index * 7 + 3) * 60_000), responseStatus: index === 7 ? "429" : "200", responseBody: index === 7 ? "Sample rate limit response" : "Sample event accepted" }));
}

export function getDemoConnection(brandId: string, platform: string, now = new Date()) {
  return { id: `demo-${platform}`, brandId, platform, accountId: platform === "shopify" ? `${getDemoBrands(now).find((brand) => brand.id === brandId)?.slug}.myshopify.com` : `sample-${platform}-account`, status: "active", lastSyncedAt: now.toISOString(), metadata: { sample: true } };
}
