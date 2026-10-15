export interface ProfitMetrics {
  revenue: number; cogs: number; transactionFees: number; adSpend: number;
  customExpenses: number; totalCost: number; grossProfit: number; netProfit: number;
  roi: number; roas: number; aov: number; profitMargin: number; orders: number;
}
export class DateRangeError extends Error {}
export interface DateRange { startDate: string; endDate: string }
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateMetrics(input: Pick<ProfitMetrics, "revenue" | "cogs" | "transactionFees" | "adSpend" | "customExpenses" | "orders">): ProfitMetrics {
  const totalCost = roundMoney(input.cogs + input.transactionFees + input.adSpend + input.customExpenses);
  const revenue = roundMoney(input.revenue);
  const netProfit = roundMoney(revenue - totalCost);
  return { ...input, revenue, totalCost, grossProfit: roundMoney(revenue - input.cogs - input.transactionFees), netProfit,
    roi: totalCost > 0 ? netProfit / totalCost * 100 : 0,
    roas: input.adSpend > 0 ? revenue / input.adSpend : 0,
    aov: input.orders > 0 ? revenue / input.orders : 0,
    profitMargin: revenue > 0 ? netProfit / revenue * 100 : 0 };
}

export function getDates({ startDate, endDate }: DateRange): string[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !Number.isFinite(start) || !Number.isFinite(end) || new Date(start).toISOString().slice(0, 10) !== startDate || new Date(end).toISOString().slice(0, 10) !== endDate || end < start || (end - start) / 86400000 > 365) throw new DateRangeError("Choose a valid date range of up to one year.");
  return Array.from({ length: (end - start) / 86400000 + 1 }, (_, index) => new Date(start + index * 86400000).toISOString().slice(0, 10));
}

export function expenseForDate(expense: { amount: string | number; frequency: string; startDate: string; endDate: string | null }, date: string): number {
  if (date < expense.startDate || (expense.endDate && date > expense.endDate)) return 0;
  const amount = Number(expense.amount) || 0;
  switch (expense.frequency) {
    case "one_time": return date === expense.startDate ? amount : 0;
    case "daily": return amount;
    case "weekly": return amount / 7;
    case "monthly": {
      const day = new Date(`${date}T00:00:00Z`);
      const days = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate();
      const cents = Math.round(amount * 100);
      return (Math.floor(cents / days) + (day.getUTCDate() <= cents % days ? 1 : 0)) / 100;
    }
    default: return 0;
  }
}

export function aggregateMetrics(metrics: ProfitMetrics[]): ProfitMetrics {
  return calculateMetrics(metrics.reduce((sum, row) => ({ revenue: sum.revenue + row.revenue, cogs: sum.cogs + row.cogs, transactionFees: sum.transactionFees + row.transactionFees, adSpend: sum.adSpend + row.adSpend, customExpenses: sum.customExpenses + row.customExpenses, orders: sum.orders + row.orders }), { revenue: 0, cogs: 0, transactionFees: 0, adSpend: 0, customExpenses: 0, orders: 0 }));
}

export function previousPeriod(range: DateRange): DateRange {
  const days = getDates(range).length;
  const end = new Date(`${range.startDate}T00:00:00Z`).getTime() - 86400000;
  return { startDate: new Date(end - (days - 1) * 86400000).toISOString().slice(0, 10), endDate: new Date(end).toISOString().slice(0, 10) };
}
