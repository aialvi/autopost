import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const brand = "00000000-0000-4000-8000-000000000101";
const protectedPaths = [
  "/api/brands", `/api/brands/${brand}`, `/api/dashboard/${brand}/overview`, "/api/dashboard/compare",
  ...["profit", "attribution", "ai", "notifications", "notifications/logs", "billing/subscription", "billing/invoices", "capi"].map(path => `/api/brands/${brand}/${path}`),
  ...["shopify", "meta", "google", "tiktok", "snapchat"].map(platform => `/api/brands/${brand}/connections/${platform}`),
  "/api/telegram/bot-info",
];
for (const path of protectedPaths) {
  test(`unauthenticated API access denied: ${path}`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(401);
  });
}
for (const job of ["daily-summary", "weekly-summary", "check-anomalies", "sync-platforms"]) {
  test(`cron rejects absent and incorrect credentials: ${job}`, async ({ request }) => {
    expect((await request.get(`/api/cron/${job}`)).status()).toBe(401);
    expect((await request.get(`/api/cron/${job}`, { headers: { Authorization: "Bearer deliberately-wrong-test-token" } })).status()).toBe(401);
  });
}
for (const path of ["/api/webhooks/shopify", "/api/billing/webhook", "/api/telegram/webhook"]) {
  test(`webhook rejects unsigned updates: ${path}`, async ({ request }) => {
    const response = await request.post(path, { data: { type: "test.invalid", data: {} } });
    expect([401, 503]).toContain(response.status());
  });
}
test("complete demo API matrix reconciles reports and rejects every mutation", async ({ baseURL }) => {
  const result = await run(process.execPath, ["scripts/test-demo.mjs"], { env: { ...process.env, DEMO_TEST_URL: baseURL }, timeout: 90_000 });
  expect(result.stdout).toContain("59 HTTP assertions");
});

test("public pixel endpoint rejects missing fields and demo-brand writes", async ({ request }) => {
  expect((await request.get(`/api/brands/${brand}/pixel-events`)).status()).toBe(405);
  expect((await request.post(`/api/brands/${brand}/pixel-events`, { data: {} })).status()).toBe(400);
  expect((await request.post(`/api/brands/${brand}/pixel-events`, { data: { brandId: brand, eventType: "page_view", sessionId: "test", pageUrl: "https://example.invalid" } })).status()).toBe(403);
});

for (const [path, method] of [
  ["/api/brands", "POST"], [`/api/brands/${brand}`, "PUT"], [`/api/brands/${brand}`, "DELETE"],
  ...["sync", "sync/shopify", "notifications/test", "billing/checkout", "capi/send"].map(path => [`/api/brands/${brand}/${path}`, "POST"]),
  [`/api/brands/${brand}/notifications`, "PUT"], [`/api/brands/${brand}/notifications`, "DELETE"], [`/api/brands/${brand}/billing/subscription`, "DELETE"],
  ...["shopify", "meta", "google", "tiktok", "snapchat"].flatMap(platform => [[`/api/brands/${brand}/connections/${platform}`, "POST"], [`/api/brands/${brand}/connections/${platform}`, "DELETE"]]),
]) {
  test(`unauthenticated mutation denied: ${method} ${path}`, async ({ request }) => {
    expect((await request.fetch(path, { method, data: {} })).status()).toBe(401);
  });
}
