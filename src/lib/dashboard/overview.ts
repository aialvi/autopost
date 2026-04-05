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

  // Get today's stats
  const today = new Date().toISOString().split("T")[0];

  const ordersResult = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${shopifyOrders.totalPrice}), 0)`,
      orderCount: count(),
    })
    .from(shopifyOrders)
    .where(
      and(
        eq(shopifyOrders.brandId, brandId),
        eq(shopifyOrders.financialStatus, "paid"),
        sql`DATE(${shopifyOrders.processedAt}) = ${today}`
      )
    );

  const adSpendResult = await db
    .select({
      totalSpend: sql<number>`COALESCE(SUM(CAST(${adDataSnapshots.spend} AS FLOAT)), 0)`,
    })
    .from(adDataSnapshots)
    .where(
      and(
        eq(adDataSnapshots.brandId, brandId),
        eq(adDataSnapshots.date, today)
      )
    );

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
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const topCampaignsData = await db
    .select({
      id: adCampaigns.id,
      name: adCampaigns.name,
      platform: adCampaigns.platform,
      status: adCampaigns.status,
      totalSpend: sql<number>`CAST(SUM(CAST(${adDataSnapshots.spend} AS FLOAT)) AS FLOAT)`,
      totalConversions: sql<number>`SUM(${adDataSnapshots.conversions})`,
    })
    .from(adCampaigns)
    .innerJoin(adDataSnapshots, eq(adCampaigns.id, adDataSnapshots.campaignId))
    .where(
      and(
        eq(adCampaigns.brandId, brandId),
        gte(adDataSnapshots.date, sevenDaysAgoStr)
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
    roas: c.totalSpend > 0 ? (c.totalConversions || 0) * 50 / parseFloat(c.totalSpend?.toString() || "1") : 0,
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
      message: `New order ${order.orderNumber} - $${parseFloat(order.totalPrice?.toString() || "0").toFixed(2)}`,
      timestamp: order.processedAt || new Date(),
    });
  }

  // Sort by timestamp
  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    connections: connectionMap as DashboardOverview["connections"],
    quickStats: {
      todayRevenue: parseFloat(ordersResult[0]?.totalRevenue?.toString() || "0"),
      todayOrders: ordersResult[0]?.orderCount || 0,
      todayAdSpend: parseFloat(adSpendResult[0]?.totalSpend?.toString() || "0"),
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
): Promise<Array<{ brandId: string; brandName: string; metrics: any }>> {
  const comparisons = [];

  for (const brandId of brandIds) {
    try {
      // Get brand name
      const brand = await db.query.brands.findFirst({
        where: eq(brands.id, brandId),
        columns: { name: true },
      });

      if (!brand) continue;

      const metrics = await calculateProfitMetrics(brandId, dateRange);

      comparisons.push({
        brandId,
        brandName: brand.name,
        metrics,
      });
    } catch (error) {
      console.error(`Error fetching comparison for brand ${brandId}:`, error);
    }
  }

  return comparisons;
}
