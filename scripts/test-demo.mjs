import assert from "node:assert/strict";

// Integration smoke test against a running development or production server.
// All mutation checks use the demo session and must be rejected before writes.
const base = process.env.DEMO_TEST_URL || "http://localhost:3000";
const email = "demo@autopost.app";
const password = "DemoPass123!";
const demoUserId = "00000000-0000-4000-8000-000000000001";
const realBrandId = "11111111-1111-4111-8111-111111111111";
const cookies = new Map();
let checks = 0;

async function request(path, options = {}) {
  const response = await fetch(new URL(path, base), {
    ...options, redirect: "manual",
    headers: { ...options.headers, Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const equals = pair.indexOf("=");
    cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
  }
  return response;
}

async function json(path, status = 200, options) {
  const response = await request(path, options);
  assert.equal(response.status, status, `${options?.method || "GET"} ${path}: expected ${status}`);
  checks++;
  return response.json();
}

async function signIn(pass) {
  const { csrfToken } = await json("/api/auth/csrf");
  await request("/api/auth/callback/credentials", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email, password: pass, callbackUrl: `${base}/dashboard` }),
  });
}

await json("/api/brands", 401);
await signIn("WrongPassword123!");
assert.equal((await json("/api/auth/session"))?.user, undefined, "Wrong demo password must not authenticate");
await signIn(password);
assert.equal((await json("/api/auth/session")).user.id, demoUserId);
const brands = await json("/api/brands");
assert.equal(brands.length, 3);
assert.ok(brands.every((brand) => brand.userRole === "viewer"));
const brandId = brands[0].id;
const prefix = `/api/brands/${brandId}`;

for (const brand of brands) {
  const overview = await json(`/api/dashboard/${brand.id}/overview`);
  assert.equal(Object.values(overview.connections).filter(Boolean).length, 5);
  assert.ok(overview.quickStats.todayRevenue > 0 && overview.topCampaigns.length >= 4);
}
const period = "startDate=2026-09-01&endDate=2026-09-30&includeBreakdown=true";
const daily = await json(`${prefix}/profit?${period}&granularity=daily`);
const overall = await json(`${prefix}/profit?${period}&granularity=overall`);
assert.equal(daily.data.length, 30);
assert.ok(Math.abs(daily.data.reduce((sum, row) => sum + row.metrics.revenue, 0) - overall.data.revenue) < 0.01);
assert.equal(overall.data.orders, daily.data.reduce((sum, row) => sum + row.metrics.orders, 0));
assert.equal(overall.data.netProfit, Math.round((overall.data.revenue - overall.data.totalCost) * 100) / 100);
for (const granularity of ["weekly", "monthly"]) {
  const result = await json(`${prefix}/profit?${period}&granularity=${granularity}`);
  assert.ok(result.data.length > 0 && result.data.length < daily.data.length);
}
await json(`${prefix}/profit?startDate=bad&endDate=bad`, 400);
await json(`${prefix}/profit?startDate=2020-01-01&endDate=2026-01-01`, 400);
const last = await json(`${prefix}/attribution?model=last_click`);
const first = await json(`${prefix}/attribution?model=first_click`);
assert.notEqual(last.byPlatform[0].attributedRevenue, first.byPlatform[0].attributedRevenue);
assert.ok(last.byCampaign.length > 0);
for (const model of ["linear", "time_decay", "position_based"]) await json(`${prefix}/attribution?model=${model}`);
const ai = await json(`${prefix}/ai`);
for (const key of ["anomalies", "insights", "recommendations"]) assert.ok(ai[key].length > 0);
assert.equal(ai.trends.forecast.length, 7);
assert.ok((await json(`${prefix}/notifications`)).preferences.telegramChatId);
const pageOne = await json(`${prefix}/notifications/logs?page=1&limit=20`);
const pageTwo = await json(`${prefix}/notifications/logs?page=2&limit=20`);
assert.equal(pageOne.logs.length, 20);
assert.notEqual(pageOne.logs[0].id, pageTwo.logs[0].id);
assert.equal((await json(`${prefix}/billing/subscription`)).tier, "pro");
assert.equal((await json(`${prefix}/billing/invoices`)).invoices.length, 6);
assert.ok((await json(`${prefix}/capi?platform=meta`)).events.every((event) => event.platform === "meta"));
assert.equal((await json(`${prefix}/sync`)).connections.length, 4);
for (const platform of ["shopify", "meta", "snapchat", "google", "tiktok"]) {
  const connection = await json(`${prefix}/connections/${platform}`);
  assert.equal(connection.connected, true);
  assert.equal(connection.connection.accessToken, undefined);
}
const comparison = await json(`/api/dashboard/compare?brandIds=${brands.map((brand) => brand.id).join(",")}`);
assert.equal(comparison.comparisons.length, 3);
assert.notEqual(comparison.comparisons[0].metrics.revenue, comparison.comparisons[1].metrics.revenue);
await json(`/api/dashboard/compare?brandIds=${brandId},${realBrandId}`, 403);
await json(`/api/dashboard/${realBrandId}/overview`, 403);
await json(`/api/brands/${realBrandId}/profit`, 403);

for (const [path, method] of [
  ["/api/brands", "POST"], [prefix, "PUT"], [prefix, "DELETE"],
  [`${prefix}/sync`, "POST"], [`${prefix}/sync/shopify`, "POST"],
  [`${prefix}/notifications`, "PUT"], [`${prefix}/notifications`, "DELETE"],
  [`${prefix}/notifications/test`, "POST"], [`${prefix}/billing/checkout`, "POST"],
  [`${prefix}/billing/subscription`, "DELETE"], [`${prefix}/capi/send`, "POST"],
  [`${prefix}/pixel-events`, "POST"],
  ...["shopify", "meta", "snapchat", "google", "tiktok"].flatMap((platform) => [[`${prefix}/connections/${platform}`, "POST"], [`${prefix}/connections/${platform}`, "DELETE"]]),
]) {
  await json(path, 403, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId, tier: "pro" }) });
}
console.log(`Demo integration checks passed (${checks} HTTP assertions): authentication, all tabs, date/model/platform filters, pagination, accounting totals, and mutation isolation.`);
