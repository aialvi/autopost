import { dateInTimezone } from "@/lib/telegram/time";
import { db } from "@/lib/db";
import {
  brands,
  shopifyOrders,
  platformConnections,
  adCampaigns,
  adDataSnapshots,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count, desc } from "drizzle-orm";
import {
  calculateProfitMetrics,
  type DateRange,
} from "@/lib/profit/calculations";

export interface DashboardOverview {
  connections: {
    shopify: boolean;
    meta: boolean;
    snapchat: boolean;
    google: boolean;
    tiktok: boolean;
  };
  quickStats: {
    todayRevenue: number;
    todayOrders: number;
    todayAdSpend: number;
    activeCampaigns: number;
  };
  topCampaigns: Array<{
    id: string;
    name: string;
    platform: string;
    spend: number;
    roas: number;
    status: string;
  }>;
  recentActivity: Array<{
    type: "order" | "sync" | "alert";
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Get dashboard overview for a brand
 */
export async function getDashboardOverview(
  brandId: string
): Promise<DashboardOverview> {
  // Get platform connections
  const connections = await db.query.platformConnections.findMany({
    where: eq(platformConnections.brandId, brandId),
  });

  const connectionMap: Record<string, boolean> = {
    shopify: false,
    meta: false,
    snapchat: false,
    google: false,
    tiktok: false,
  };

  for (const conn of connections) {
    connectionMap[conn.platform] = conn.status === "active";
  }

  const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
  if (!brand) throw new Error("Brand not found");
  const today = dateInTimezone(new Date(), brand.timezone);
  const todayMetrics = await calculateProfitMetrics(brandId, { startDate: today, endDate: today });

  const activeCampaignsResult = await db
    .select({
      count: count(),
    })
    .from(adCampaigns)
    .where(
      and(
        eq(adCampaigns.brandId, brandId),
        sql`${adCampaigns.status} IN ('active', 'enabled', 'running')`
      )
    );

  // Get top campaigns by spend (last 7 days)
  const sevenDaysAgo = new Date(`${today}T00:00:00Z`);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const topCampaignsData = await db
    .select({
      id: adCampaigns.id,
      name: adCampaigns.name,
      platform: adCampaigns.platform,
      status: adCampaigns.status,
      totalSpend: sql<number>`CAST(SUM(CAST(${adDataSnapshots.spend} AS FLOAT)) AS FLOAT)`,
      totalRevenue: sql<number>`SUM(${adDataSnapshots.revenueReported})`,
    })
    .from(adCampaigns)
    .innerJoin(adDataSnapshots, eq(adCampaigns.id, adDataSnapshots.campaignId))
    .where(
      and(
        eq(adCampaigns.brandId, brandId),
        gte(adDataSnapshots.date, sevenDaysAgoStr), lte(adDataSnapshots.date, today)
      )
    )
    .groupBy(adCampaigns.id, adCampaigns.name, adCampaigns.platform, adCampaigns.status)
    .orderBy(desc(sql`SUM(CAST(${adDataSnapshots.spend} AS FLOAT))`))
    .limit(5);

  const topCampaigns = topCampaignsData.map((c) => ({
    id: c.id,
    name: c.name,
    platform: c.platform,
    spend: parseFloat(c.totalSpend?.toString() || "0"),
    roas: c.totalSpend > 0 ? Number(c.totalRevenue || 0) / parseFloat(c.totalSpend?.toString() || "1") : 0,
    status: c.status,
  }));

  // Get recent activity (simplified - in real app would query from sync logs)
  const recentActivity: DashboardOverview["recentActivity"] = [];

  // Add recent orders
  const recentOrders = await db
    .select({
      orderNumber: shopifyOrders.orderNumber,
      totalPrice: shopifyOrders.totalPrice,
      processedAt: shopifyOrders.processedAt,
    })
    .from(shopifyOrders)
    .where(
      and(
        eq(shopifyOrders.brandId, brandId),
        eq(shopifyOrders.financialStatus, "paid")
      )
    )
    .orderBy(desc(shopifyOrders.processedAt))
    .limit(3);

  for (const order of recentOrders) {
    recentActivity.push({
      type: "order",
      message: `New order ${order.orderNumber} - ${new Intl.NumberFormat("en-US", { style: "currency", currency: brand.currency }).format(Number(order.totalPrice))}`,
      timestamp: order.processedAt || new Date(),
    });
  }

  // Sort by timestamp
  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    connections: connectionMap as DashboardOverview["connections"],
    quickStats: {
      todayRevenue: todayMetrics.revenue,
      todayOrders: todayMetrics.orders,
      todayAdSpend: todayMetrics.adSpend,
      activeCampaigns: activeCampaignsResult[0]?.count || 0,
    },
    topCampaigns,
    recentActivity,
  };
}

/**
 * Get multi-brand comparison data
 */
export async function getMultiBrandComparison(
  brandIds: string[],
  dateRange: DateRange
): Promise<Array<{ brandId: string; brandName: string; currency: string; metrics: Awaited<ReturnType<typeof calculateProfitMetrics>> }>> {
  const comparisons = [];

  for (const brandId of brandIds) {
    try {
      // Get brand name
      const brand = await db.query.brands.findFirst({
        where: eq(brands.id, brandId),
        columns: { name: true, currency: true },
      });

      if (!brand) continue;

      const metrics = await calculateProfitMetrics(brandId, dateRange);

      comparisons.push({
        brandId,
        brandName: brand.name,
        currency: brand.currency,
        metrics,
      });
    } catch (error) {
      console.error(`Error fetching comparison for brand ${brandId}:`, error);
    }
  }

  return comparisons;
}
