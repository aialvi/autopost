import test from "node:test";
import assert from "node:assert/strict";
import { expenseSchema } from "../src/lib/validators/expense";
import { calculateMetrics, expenseForDate, previousPeriod } from "../src/lib/profit/metrics";
import { googleBudgets, tiktokBudgets } from "../src/lib/platforms/ads/budgets";
import { summaryIsDue } from "../src/lib/telegram/time";
import { formatSummary } from "../src/lib/telegram/summary";
import { insightsFromMetrics } from "../src/lib/ai/insights";
import { getDemoApiResponse } from "../src/lib/demo/api";
import { DEMO_BRAND_IDS, DEMO_USER_ID } from "../src/lib/demo/config";

test("expense input rejects invalid dates, precision, negative costs and reversed periods", () => {
  const valid = { name: "Hosting", amount: 29.99, frequency: "monthly", startDate: "2026-10-01", endDate: null };
  assert.equal(expenseSchema.safeParse(valid).success, true);
  for (const changes of [{ amount: -1 }, { amount: 0 }, { amount: 1.001 }, { name: " " }, { startDate: "2026-02-30" }, { endDate: "2026-09-01" }, { frequency: "annually" }]) assert.equal(expenseSchema.safeParse({ ...valid, ...changes }).success, false);
  const expense = { ...valid, endDate: "2026-10-31" };
  const total = Array.from({ length: 31 }, (_, i) => expenseForDate(expense, `2026-10-${String(i + 1).padStart(2, "0")}`)).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(total * 100), 2999);
  assert.equal(expenseForDate(expense, "2026-11-01"), 0);
});

test("comparison periods contain equal inclusive day counts including single days and leap years", () => {
  assert.deepEqual(previousPeriod({ startDate: "2026-10-15", endDate: "2026-10-15" }), { startDate: "2026-10-14", endDate: "2026-10-14" });
  assert.deepEqual(previousPeriod({ startDate: "2024-03-01", endDate: "2024-03-07" }), { startDate: "2024-02-23", endDate: "2024-02-29" });
});

test("budgets distinguish daily, lifetime, shared, unlimited and absent values", () => {
  assert.deepEqual(tiktokBudgets(150, "BUDGET_MODE_DAY"), { dailyBudget: "150.00", lifetimeBudget: null });
  assert.deepEqual(tiktokBudgets(900, "BUDGET_MODE_TOTAL"), { dailyBudget: null, lifetimeBudget: "900.00" });
  assert.equal(tiktokBudgets(100, "BUDGET_MODE_INFINITE").dailyBudget, null);
  assert.equal(googleBudgets({ amountMicros: "20000000", period: "DAILY", explicitlyShared: true }).dailyBudget, null);
  assert.equal(googleBudgets({ amountMicros: "20000000", period: "DAILY", explicitlyShared: false }).dailyBudget, "20.00");
  assert.equal(googleBudgets({ totalAmountMicros: "900000000", period: "CUSTOM_PERIOD", explicitlyShared: false }).lifetimeBudget, "900.00");
  assert.equal(tiktokBudgets("invalid", "BUDGET_MODE_DAY").dailyBudget, null);
});

test("summary eligibility uses recipient timezone, Monday schedule, and retries after quiet hours", () => {
  const pref = { timezone: "Asia/Dhaka", quietHoursStart: "08:00", quietHoursEnd: "10:00" };
  assert.equal(summaryIsDue("daily-summary", pref, new Date("2026-10-19T03:30:00Z")), false);
  assert.equal(summaryIsDue("weekly-summary", pref, new Date("2026-10-19T04:00:00Z")), true);
  assert.equal(summaryIsDue("weekly-summary", pref, new Date("2026-10-20T04:00:00Z")), false);
  assert.equal(summaryIsDue("daily-summary", { ...pref, quietHoursStart: null, quietHoursEnd: null }, new Date("2026-10-19T02:00:00Z")), false);
});

test("summary shows actual profit, currency, brand, period and escaped campaign text", () => {
  const text = formatSummary({ brandName: "A&B", currency: "EUR", date: "2026-10-18", startDate: "2026-10-12", revenue: 100, netProfit: -20, orders: 2, adSpend: 50, roas: 2, topCampaigns: [{ name: "<campaign>", spend: 50, roas: 2 }] }, true);
  assert.match(text, /Net profit: <b>-€20.00/);
  assert.match(text, /A&amp;B/); assert.match(text, /2026-10-12 to 2026-10-18/); assert.match(text, /&lt;campaign&gt;/);
  assert.doesNotMatch(text, /Great week|Average ROAS/);
});

test("insights avoid false warnings for empty accounts and infinite AOV growth", () => {
  const empty = calculateMetrics({ revenue: 0, cogs: 0, transactionFees: 0, adSpend: 0, customExpenses: 0, orders: 0 });
  assert.deepEqual(insightsFromMetrics(empty, empty), []);
  const current = calculateMetrics({ revenue: 100, cogs: 10, transactionFees: 3, adSpend: 200, customExpenses: 0, orders: 1 });
  const insights = insightsFromMetrics(current, empty);
  assert.ok(insights.some(i => i.id === "low_roas"));
  assert.ok(!insights.some(i => i.id === "aov_increase"));
  assert.doesNotMatch(JSON.stringify(insights), /Infinity|NaN/);
});

test("demo campaign filters respect dates and platform and expenses remain read-only", async () => {
  process.env.DEMO_ENABLED = "true";
  const base = `http://localhost/api/brands/${DEMO_BRAND_IDS[0]}`;
  const res = getDemoApiResponse(DEMO_USER_ID, new Request(`${base}/campaigns?startDate=2026-10-01&endDate=2026-10-07&platform=google`));
  const report = await res!.json(); assert.equal(report.total, 1); assert.equal(report.campaigns[0].platform, "google"); assert.equal(report.campaigns[0].syncedDays, 7); assert.equal(report.campaigns[0].spend, report.breakdown.google.spend);
  assert.equal(getDemoApiResponse(DEMO_USER_ID, new Request(`${base}/expenses`, { method: "POST" }))?.status, 403);
});
