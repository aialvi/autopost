// A missing, unlimited, or shared budget must never become a per-campaign zero.
export function budgetAmount(value: unknown, divisor = 1): string | null {
  const amount = Number(value) / divisor;
  return Number.isFinite(amount) && amount > 0 && amount <= 99999999.99 ? amount.toFixed(2) : null;
}
export function tiktokBudgets(budget: unknown, mode?: string) {
  return { dailyBudget: mode === "BUDGET_MODE_DAY" ? budgetAmount(budget) : null, lifetimeBudget: mode === "BUDGET_MODE_TOTAL" ? budgetAmount(budget) : null };
}
export function googleBudgets(budget?: { amountMicros?: string | number; totalAmountMicros?: string | number; period?: string; explicitlyShared?: boolean }) {
  if (!budget || budget.explicitlyShared !== false) return { dailyBudget: null, lifetimeBudget: null };
  return { dailyBudget: budget.period === "DAILY" ? budgetAmount(budget.amountMicros, 1e6) : null, lifetimeBudget: budget.period === "CUSTOM_PERIOD" ? budgetAmount(budget.totalAmountMicros, 1e6) : null };
}
