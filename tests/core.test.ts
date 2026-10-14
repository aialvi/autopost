import test from "node:test";
import assert from "node:assert/strict";
import { calculateMetrics, aggregateMetrics, expenseForDate, getDates } from "../src/lib/profit/metrics";
import { snapshotId } from "../src/lib/platforms/ads/snapshot";
import { isAuthorizedCron } from "../src/lib/jobs/authorize";
import { isQuietHours, dateInTimezone } from "../src/lib/telegram/time";
import { verifyWebhookHMAC, hashEmail } from "../src/lib/platforms/shopify/client";
import { protectSecret, revealSecret, safeConnection } from "../src/lib/platforms/connection-secrets";
import { createHmac } from "node:crypto";

 test("profit accounts for COGS, fees, spend, expenses and refunds in net revenue", () => {
  const row = calculateMetrics({ revenue: 900, cogs: 250, transactionFees: 30, adSpend: 200, customExpenses: 40, orders: 10 });
  assert.equal(row.totalCost, 520); assert.equal(row.netProfit, 380); assert.equal(row.grossProfit, 620); assert.equal(row.roas, 4.5); assert.equal(row.aov, 90);
  const total = aggregateMetrics([row, calculateMetrics({ revenue: 100, cogs: 40, transactionFees: 5, adSpend: 50, customExpenses: 5, orders: 1 })]);
  assert.equal(total.revenue, 1000); assert.equal(total.roas, 4); assert.equal(total.orders, 11);
  assert.ok(Object.values(calculateMetrics({ revenue: 0, cogs: 0, transactionFees: 0, adSpend: 0, customExpenses: 0, orders: 0 })).every(Number.isFinite));
});
test("date filters reject rolled-over dates, inverted periods, and unbounded ranges", () => {
 assert.equal(getDates({ startDate: "2024-02-28", endDate: "2024-03-01" }).length, 3);
 for (const range of [{startDate:"2026-02-30",endDate:"2026-03-01"},{startDate:"2026-10-02",endDate:"2026-10-01"},{startDate:"2020-01-01",endDate:"2026-01-01"}]) assert.throws(()=>getDates(range));
});
test("recurring expenses apply only during their overlap and respect calendar month lengths", () => {
 const expense={amount:"280",frequency:"monthly",startDate:"2026-02-10",endDate:"2026-02-12"};
 assert.equal(expenseForDate(expense,"2026-02-09"),0); assert.equal(expenseForDate(expense,"2026-02-10"),10); assert.equal(expenseForDate(expense,"2026-02-13"),0);
 assert.equal(expenseForDate({...expense,frequency:"one_time"},"2026-02-11"),0);
 const month=getDates({startDate:"2026-01-01",endDate:"2026-01-31"});
 assert.equal(Math.round(month.reduce((sum,date)=>sum+expenseForDate({amount:"100",frequency:"monthly",startDate:"2026-01-01",endDate:null},date),0)*100),10000);
});
test("ad snapshots are idempotent and isolated by brand/platform/day", () => {
 const id=snapshotId("one","meta","campaign","2026-10-14"); assert.equal(id,snapshotId("one","meta","campaign","2026-10-14"));
 for(const args of [["two","meta","campaign","2026-10-14"],["one","google","campaign","2026-10-14"],["one","meta","campaign","2026-10-15"]]) assert.notEqual(id,snapshotId(...args as [string,string,string,string]));
});
test("cron jobs reject absent, missing and incorrect bearer secrets", () => {
 assert.equal(isAuthorizedCron(new Request("http://localhost"),"secret"),false);
 assert.equal(isAuthorizedCron(new Request("http://localhost",{headers:{authorization:"Bearer secret"}}),"secret"),true);
 assert.equal(isAuthorizedCron(new Request("http://localhost",{headers:{authorization:"Bearer bad"}}),"secret"),false);
 assert.equal(isAuthorizedCron(new Request("http://localhost"),""),false);
});
test("quiet hours include minutes, midnight boundaries and brand timezones", () => {
 const prefs={quietHoursStart:"22:30",quietHoursEnd:"07:15",timezone:"UTC"};
 assert.equal(isQuietHours(prefs,new Date("2026-10-14T22:29:00Z")),false);
 assert.equal(isQuietHours(prefs,new Date("2026-10-14T22:30:00Z")),true);
 assert.equal(isQuietHours(prefs,new Date("2026-10-15T00:00:00Z")),true);
 assert.equal(isQuietHours(prefs,new Date("2026-10-15T07:15:00Z")),false);
 assert.equal(dateInTimezone(new Date("2026-10-14T02:00:00Z"),"America/New_York"),"2026-10-13");
});
test("Shopify HMAC validates the raw body and handles malformed signatures", () => {
 const body='{"id":123}';const mac=createHmac("sha256","secret").update(body).digest("base64");
 assert.equal(verifyWebhookHMAC(body,mac,"secret"),true);assert.equal(verifyWebhookHMAC(body+" ",mac,"secret"),false);assert.equal(verifyWebhookHMAC(body,"bad","secret"),false);
 assert.equal(hashEmail(null),hashEmail(""));
});
test("connection tokens round-trip encrypted and never appear in API display fields", () => {
 process.env.ENCRYPTION_KEY="a".repeat(64);
 const token=protectSecret("test-private-token"); assert.notEqual(token,"test-private-token"); assert.equal(revealSecret(token),"test-private-token");
 assert.equal(revealSecret("legacy-token"),"legacy-token");
 const safe=safeConnection({id:"id",platform:"meta",accountId:"123",status:"active",lastSyncedAt:null,accessToken:token,refreshToken:"secret",metadata:{clientSecret:"secret"}} as Parameters<typeof safeConnection>[0]);
 assert.ok(!JSON.stringify(safe).includes("secret")&&!JSON.stringify(safe).includes("enc:v1"));
});
