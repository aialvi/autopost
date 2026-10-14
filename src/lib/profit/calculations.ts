import { db } from "@/lib/db";
import { brands, shopifyOrders, shopifyOrderItems, transactionFees, adDataSnapshots, customExpenses } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { aggregateMetrics, calculateMetrics, expenseForDate, getDates, roundMoney, type DateRange, type ProfitMetrics } from "./metrics";
export type { DateRange, ProfitMetrics } from "./metrics";
export interface DailyProfitData { date: string; metrics: ProfitMetrics }

// Fetch period totals in grouped queries, rather than six queries per day.
export async function getDailyProfitData(brandId: string, dateRange: DateRange): Promise<DailyProfitData[]> {
  const dates = getDates(dateRange);
  const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
  if (!brand) throw new Error("Brand not found");
  const localDate = sql<string>`TO_CHAR(${shopifyOrders.processedAt} AT TIME ZONE 'UTC' AT TIME ZONE ${brand.timezone}, 'YYYY-MM-DD')`;
  const eligible = and(eq(shopifyOrders.brandId, brandId), gte(localDate, dateRange.startDate), lte(localDate, dateRange.endDate), sql`${shopifyOrders.financialStatus} IN ('paid', 'partially_refunded', 'refunded')`);
  const [orders, costs, fees, spend, expenses] = await Promise.all([
    db.select({ date: localDate, revenue: sql<string>`COALESCE(SUM(${shopifyOrders.totalPrice} - ${shopifyOrders.refundAmount}), 0)`, orders: count() }).from(shopifyOrders).where(eligible).groupBy(sql`1`),
    db.select({ date: localDate, cogs: sql<string>`COALESCE(SUM(COALESCE(${shopifyOrderItems.totalCost}, ${shopifyOrderItems.costPerItem} * CAST(${shopifyOrderItems.quantity} AS NUMERIC), ${shopifyOrderItems.price} * CAST(${shopifyOrderItems.quantity} AS NUMERIC) * ${Number(brand.defaultCogsPercentage) / 100})), 0)` }).from(shopifyOrderItems).innerJoin(shopifyOrders, eq(shopifyOrderItems.orderId, shopifyOrders.id)).where(eligible).groupBy(sql`1`),
    db.select({ date: localDate, fees: sql<string>`COALESCE(SUM(${transactionFees.feeAmount}), 0)` }).from(transactionFees).innerJoin(shopifyOrders, eq(transactionFees.orderId, shopifyOrders.id)).where(eligible).groupBy(sql`1`),
    db.select({ date: adDataSnapshots.date, spend: sql<string>`COALESCE(SUM(${adDataSnapshots.spend}), 0)` }).from(adDataSnapshots).where(and(eq(adDataSnapshots.brandId, brandId), gte(adDataSnapshots.date, dateRange.startDate), lte(adDataSnapshots.date, dateRange.endDate))).groupBy(adDataSnapshots.date),
    db.query.customExpenses.findMany({ where: eq(customExpenses.brandId, brandId) }),
  ]);
  const orderMap = new Map(orders.map((row) => [row.date, row]));
  const costMap = new Map(costs.map((row) => [row.date, Number(row.cogs)]));
  const feeMap = new Map(fees.map((row) => [row.date, Number(row.fees)]));
  const spendMap = new Map(spend.map((row) => [row.date, Number(row.spend)]));
  return dates.map((date) => ({ date, metrics: calculateMetrics({
    revenue: Number(orderMap.get(date)?.revenue ?? 0), orders: Number(orderMap.get(date)?.orders ?? 0),
    cogs: roundMoney(costMap.get(date) ?? 0), transactionFees: roundMoney(feeMap.get(date) ?? 0), adSpend: roundMoney(spendMap.get(date) ?? 0),
    customExpenses: roundMoney(expenses.reduce((sum, expense) => sum + expenseForDate(expense, date), 0)),
  }) }));
}

export async function calculateProfitMetrics(brandId: string, dateRange: DateRange): Promise<ProfitMetrics> {
  return aggregateMetrics((await getDailyProfitData(brandId, dateRange)).map((day) => day.metrics));
}

async function groupedProfit(brandId: string, dateRange: DateRange, mode: "weekly" | "monthly") {
  const daily = await getDailyProfitData(brandId, dateRange);
  const groups = new Map<string, ProfitMetrics[]>();
  for (const day of daily) {
    const date = new Date(`${day.date}T00:00:00Z`);
    if (mode === "weekly") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    else date.setUTCDate(1);
    const key = date.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), day.metrics]);
  }
  return [...groups].map(([date, metrics]) => ({ date, metrics: aggregateMetrics(metrics) }));
}
export const getWeeklyProfitData = (brandId: string, dateRange: DateRange) => groupedProfit(brandId, dateRange, "weekly");
export const getMonthlyProfitData = (brandId: string, dateRange: DateRange) => groupedProfit(brandId, dateRange, "monthly");

export async function getPlatformProfitBreakdown(brandId: string, dateRange: DateRange): Promise<Record<string, { spend: number; revenue: number; roas: number }>> {
  getDates(dateRange);
  const rows = await db.select({ platform: adDataSnapshots.platform, spend: sql<string>`COALESCE(SUM(${adDataSnapshots.spend}), 0)`, revenue: sql<string>`COALESCE(SUM(${adDataSnapshots.revenueReported}), 0)` }).from(adDataSnapshots).where(and(eq(adDataSnapshots.brandId, brandId), gte(adDataSnapshots.date, dateRange.startDate), lte(adDataSnapshots.date, dateRange.endDate))).groupBy(adDataSnapshots.platform);
  return Object.fromEntries(rows.map((row) => { const spend = Number(row.spend); const revenue = Number(row.revenue); return [row.platform, { spend, revenue, roas: spend > 0 ? revenue / spend : 0 }]; }));
}
