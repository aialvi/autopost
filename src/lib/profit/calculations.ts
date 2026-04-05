import { db } from "@/lib/db";
import {
  shopifyOrders,
  shopifyOrderItems,
  transactionFees,
  adDataSnapshots,
  customExpenses,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, sum, count } from "drizzle-orm";

export interface ProfitMetrics {
  revenue: number;
  cogs: number;
  transactionFees: number;
  adSpend: number;
  customExpenses: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  roi: number;
  roas: number;
  aov: number;
  profitMargin: number;
  orders: number;
}

export interface DailyProfitData {
  date: string;
  metrics: ProfitMetrics;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Convert decimal or string to number
 */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  // @ts-ignore - Decimal has toNumber()
  if (typeof value === "object" && typeof (value as any).toNumber === "function") {
    return (value as any).toNumber();
  }
  return parseFloat(String(value)) || 0;
}

/**
 * Calculate profit metrics for a brand within a date range
 */
export async function calculateProfitMetrics(
  brandId: string,
  dateRange: DateRange
): Promise<ProfitMetrics> {
  const { startDate, endDate } = dateRange;

  // Get orders data
  const ordersResult = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${shopifyOrders.totalPrice}), 0)`,
      totalRefunds: sql<number>`COALESCE(SUM(${shopifyOrders.refundAmount}), 0)`,
      orderCount: count(),
    })
    .from(shopifyOrders)
    .where(
      and(
        eq(shopifyOrders.brandId, brandId),
        sql`${shopifyOrders.processedAt}::date >= ${startDate}`,
        sql`${shopifyOrders.processedAt}::date <= ${endDate}`,
        sql`${shopifyOrders.financialStatus} = 'paid'`
      )
    );

  const ordersData = ordersResult[0] || { totalRevenue: 0, totalRefunds: 0, orderCount: 0 };
  const revenue = toNumber(ordersData.totalRevenue) - toNumber(ordersData.totalRefunds);
  const orders = ordersData.orderCount || 0;

  // Get COGS from order items
  const cogsResult = await db
    .select({
      totalCogs: sql<number>`COALESCE(SUM(${shopifyOrderItems.totalCost}), 0)`,
    })
    .from(shopifyOrderItems)
    .innerJoin(shopifyOrders, eq(shopifyOrderItems.orderId, shopifyOrders.id))
    .where(
      and(
        eq(shopifyOrders.brandId, brandId),
        sql`${shopifyOrders.processedAt}::date >= ${startDate}`,
        sql`${shopifyOrders.processedAt}::date <= ${endDate}`,
        sql`${shopifyOrders.financialStatus} = 'paid'`
      )
    );

  const cogs = toNumber(cogsResult[0]?.totalCogs);

  // Get transaction fees
  const feesResult = await db
    .select({
      totalFees: sql<number>`COALESCE(SUM(${transactionFees.feeAmount}), 0)`,
    })
    .from(transactionFees)
    .innerJoin(shopifyOrders, eq(transactionFees.orderId, shopifyOrders.id))
    .where(
      and(
        eq(shopifyOrders.brandId, brandId),
        sql`${shopifyOrders.processedAt}::date >= ${startDate}`,
        sql`${shopifyOrders.processedAt}::date <= ${endDate}`,
        sql`${shopifyOrders.financialStatus} = 'paid'`
      )
    );

  const transactionFeesAmount = toNumber(feesResult[0]?.totalFees);

  // Get ad spend
  const adSpendResult = await db
    .select({
      totalSpend: sql<number>`COALESCE(SUM(${adDataSnapshots.spend}), 0)`,
    })
    .from(adDataSnapshots)
    .where(
      and(
        eq(adDataSnapshots.brandId, brandId),
        gte(adDataSnapshots.date, startDate),
        lte(adDataSnapshots.date, endDate)
      )
    );

  const adSpend = toNumber(adSpendResult[0]?.totalSpend);

  // Get custom expenses (one-time and prorated recurring)
  const customExpensesResult = await db
    .select({
      amount: customExpenses.amount,
      frequency: customExpenses.frequency,
      startDate: customExpenses.startDate,
      endDate: customExpenses.endDate,
    })
    .from(customExpenses)
    .where(eq(customExpenses.brandId, brandId));

  let customExpensesAmount = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  for (const expense of customExpensesResult) {
    const expenseStart = new Date(expense.startDate);
    const expenseEnd = expense.endDate ? new Date(expense.endDate) : new Date();

    // Check if expense overlaps with date range
    if (expenseEnd < start || expenseStart > end) continue;

    const amount = toNumber(expense.amount);

    switch (expense.frequency) {
      case "one_time":
        // Only include if the expense start date is within range
        if (expenseStart >= start && expenseStart <= end) {
          customExpensesAmount += amount;
        }
        break;
      case "daily":
        customExpensesAmount += amount * dayDiff;
        break;
      case "weekly":
        const weeks = dayDiff / 7;
        customExpensesAmount += amount * weeks;
        break;
      case "monthly":
        const months = dayDiff / 30.44; // Average days in a month
        customExpensesAmount += amount * months;
        break;
    }
  }

  // Calculate totals
  const totalCost = cogs + transactionFeesAmount + adSpend + customExpensesAmount;
  const grossProfit = revenue - cogs - transactionFeesAmount;
  const netProfit = revenue - totalCost;

  // Calculate metrics
  const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;
  const roas = adSpend > 0 ? revenue / adSpend : 0;
  const aov = orders > 0 ? revenue / orders : 0;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    transactionFees: transactionFeesAmount,
    adSpend,
    customExpenses: customExpensesAmount,
    totalCost,
    grossProfit,
    netProfit,
    roi,
    roas,
    aov,
    profitMargin,
    orders,
  };
}

/**
 * Get daily profit data for a brand within a date range
 */
export async function getDailyProfitData(
  brandId: string,
  dateRange: DateRange
): Promise<DailyProfitData[]> {
  const { startDate, endDate } = dateRange;

  // Generate all dates in range
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  // Calculate metrics for each date
  const dailyData = await Promise.all(
    dates.map(async (date) => {
      const metrics = await calculateProfitMetrics(brandId, {
        startDate: date,
        endDate: date,
      });
      return {
        date,
        metrics,
      };
    })
  );

  return dailyData;
}

/**
 * Get aggregated profit data by week
 */
export async function getWeeklyProfitData(
  brandId: string,
  dateRange: DateRange
): Promise<DailyProfitData[]> {
  const dailyData = await getDailyProfitData(brandId, dateRange);

  // Group by week
  const weeklyData: Map<string, ProfitMetrics> = new Map();

  for (const day of dailyData) {
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Sunday
    const weekKey = weekStart.toISOString().split("T")[0];

    const existing = weeklyData.get(weekKey);
    if (existing) {
      weeklyData.set(weekKey, {
        revenue: existing.revenue + day.metrics.revenue,
        cogs: existing.cogs + day.metrics.cogs,
        transactionFees: existing.transactionFees + day.metrics.transactionFees,
        adSpend: existing.adSpend + day.metrics.adSpend,
        customExpenses: existing.customExpenses + day.metrics.customExpenses,
        totalCost: existing.totalCost + day.metrics.totalCost,
        grossProfit: existing.grossProfit + day.metrics.grossProfit,
        netProfit: existing.netProfit + day.metrics.netProfit,
        roi: 0, // Will recalculate
        roas: 0, // Will recalculate
        aov: 0, // Will recalculate
        profitMargin: 0, // Will recalculate
        orders: existing.orders + day.metrics.orders,
      });
    } else {
      weeklyData.set(weekKey, { ...day.metrics });
    }
  }

  // Recalculate derived metrics
  const result: DailyProfitData[] = [];
  for (const [week, metrics] of weeklyData.entries()) {
    const roi = metrics.totalCost > 0 ? ((metrics.revenue - metrics.totalCost) / metrics.totalCost) * 100 : 0;
    const roas = metrics.adSpend > 0 ? metrics.revenue / metrics.adSpend : 0;
    const aov = metrics.orders > 0 ? metrics.revenue / metrics.orders : 0;
    const profitMargin = metrics.revenue > 0 ? (metrics.netProfit / metrics.revenue) * 100 : 0;

    result.push({
      date: week,
      metrics: {
        ...metrics,
        roi,
        roas,
        aov,
        profitMargin,
      },
    });
  }

  return result;
}

/**
 * Get aggregated profit data by month
 */
export async function getMonthlyProfitData(
  brandId: string,
  dateRange: DateRange
): Promise<DailyProfitData[]> {
  const dailyData = await getDailyProfitData(brandId, dateRange);

  // Group by month
  const monthlyData: Map<string, ProfitMetrics> = new Map();

  for (const day of dailyData) {
    const monthKey = day.date.substring(0, 7); // YYYY-MM

    const existing = monthlyData.get(monthKey);
    if (existing) {
      monthlyData.set(monthKey, {
        revenue: existing.revenue + day.metrics.revenue,
        cogs: existing.cogs + day.metrics.cogs,
        transactionFees: existing.transactionFees + day.metrics.transactionFees,
        adSpend: existing.adSpend + day.metrics.adSpend,
        customExpenses: existing.customExpenses + day.metrics.customExpenses,
        totalCost: existing.totalCost + day.metrics.totalCost,
        grossProfit: existing.grossProfit + day.metrics.grossProfit,
        netProfit: existing.netProfit + day.metrics.netProfit,
        roi: 0,
        roas: 0,
        aov: 0,
        profitMargin: 0,
        orders: existing.orders + day.metrics.orders,
      });
    } else {
      monthlyData.set(monthKey, { ...day.metrics });
    }
  }

  // Recalculate derived metrics
  const result: DailyProfitData[] = [];
  for (const [month, metrics] of monthlyData.entries()) {
    const roi = metrics.totalCost > 0 ? ((metrics.revenue - metrics.totalCost) / metrics.totalCost) * 100 : 0;
    const roas = metrics.adSpend > 0 ? metrics.revenue / metrics.adSpend : 0;
    const aov = metrics.orders > 0 ? metrics.revenue / metrics.orders : 0;
    const profitMargin = metrics.revenue > 0 ? (metrics.netProfit / metrics.revenue) * 100 : 0;

    result.push({
      date: month,
      metrics: {
        ...metrics,
        roi,
        roas,
        aov,
        profitMargin,
      },
    });
  }

  return result;
}

/**
 * Get profit breakdown by platform
 */
export async function getPlatformProfitBreakdown(
  brandId: string,
  dateRange: DateRange
): Promise<Record<string, { spend: number; revenue: number; roas: number }>> {
  const { startDate, endDate } = dateRange;

  const adData = await db
    .select({
      platform: adDataSnapshots.platform,
      totalSpend: sql<number>`COALESCE(SUM(${adDataSnapshots.spend}), 0)`,
    })
    .from(adDataSnapshots)
    .where(
      and(
        eq(adDataSnapshots.brandId, brandId),
        gte(adDataSnapshots.date, startDate),
        lte(adDataSnapshots.date, endDate)
      )
    )
    .groupBy(adDataSnapshots.platform);

  // Get total revenue for the period (for ROAS calculation)
  const ordersResult = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${shopifyOrders.totalPrice}), 0)`,
      totalRefunds: sql<number>`COALESCE(SUM(${shopifyOrders.refundAmount}), 0)`,
    })
    .from(shopifyOrders)
    .where(
      and(
        eq(shopifyOrders.brandId, brandId),
        sql`${shopifyOrders.processedAt}::date >= ${startDate}`,
        sql`${shopifyOrders.processedAt}::date <= ${endDate}`,
        sql`${shopifyOrders.financialStatus} = 'paid'`
      )
    );

  const totalRevenue =
    toNumber(ordersResult[0]?.totalRevenue) - toNumber(ordersResult[0]?.totalRefunds);

  const result: Record<string, { spend: number; revenue: number; roas: number }> = {};

  for (const platform of adData) {
    const spend = toNumber(platform.totalSpend);
    // Allocate revenue proportionally based on spend
    const revenueShare = spend > 0 ? (spend / adData.reduce((sum, p) => sum + toNumber(p.totalSpend), 0)) * totalRevenue : 0;
    const roas = spend > 0 ? revenueShare / spend : 0;

    result[platform.platform] = {
      spend,
      revenue: revenueShare,
      roas,
    };
  }

  return result;
}
