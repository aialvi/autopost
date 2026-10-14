import { test, expect } from "@playwright/test";
import { signInDemo, expectNoOverflow } from "../helpers/demo";

test.beforeEach(async ({ page }) => { await signInDemo(page); });

test("profit chart keeps axes inside its card and supports keyboard detail and metric switching", async ({ page }) => {
  await page.goto("/dashboard/profit");
  const chart = page.getByRole("figure", { name: "Net Profit over time" });
  await expect(chart).toBeVisible();
  const bars = chart.getByRole("button");
  await expect.poll(() => bars.count()).toBeGreaterThan(0);
  await bars.first().focus();
  await expect(chart.locator('[aria-live="polite"]')).toContainText("Net Profit:");
  const card = chart.locator("../..");
  const bounds = await card.boundingBox();
  expect(bounds).not.toBeNull();
  for (const label of await chart.locator('span').filter({ hasText: /^\$/ }).all()) {
    const labelBounds = await label.boundingBox();
    if (labelBounds) expect(labelBounds.x).toBeGreaterThanOrEqual(bounds!.x);
  }
  await page.getByRole("group", { name: "Chart metric" }).getByRole("button", { name: "Revenue", exact: true }).click();
  await expect(page.getByRole("figure", { name: "Revenue over time" })).toBeVisible();
  await page.getByRole("combobox", { name: "Profit granularity" }).click();
  await page.getByRole("option", { name: "Overall", exact: true }).click();
  await expect(page.getByText("Profit Margin", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
});

test("negative and zero values use a correct shared baseline", async ({ page }) => {
  await page.route("**/api/brands/*/profit?**", async route => {
    const response = await route.fetch();
    const body = await response.json();
    if (Array.isArray(body.data)) body.data = body.data.slice(0, 3).map((row: { metrics: Record<string, number> }, index: number) => ({ ...row, metrics: { ...row.metrics, netProfit: [100, -50, 0][index] } }));
    await route.fulfill({ response, json: body });
  });
  await page.goto("/dashboard/profit");
  const chart = page.getByRole("figure", { name: "Net Profit over time" });
  await expect(chart.getByRole("button")).toHaveCount(3);
  const spans = chart.getByRole("button").locator("span");
  const [positive, negative, zero] = await spans.evaluateAll(elements => elements.map(el => ({ top: parseFloat((el as HTMLElement).style.top), height: parseFloat((el as HTMLElement).style.height) })));
  expect(positive.top + positive.height).toBeCloseTo(negative.top);
  expect(negative.height).toBeGreaterThan(0);
  expect(zero.height).toBe(0);
  await chart.getByRole("button").nth(1).click();
  await expect(chart.locator('[aria-live="polite"]')).toContainText("-$50.00");
  await expectNoOverflow(page);
});
