import { test, expect } from "@playwright/test";
import { signInDemo, expectNoOverflow } from "../helpers/demo";
import { DEMO_BRAND_IDS } from "../../src/lib/demo/config";

test("campaign reporting supports all platforms, date filters, errors and mobile tables", async ({ page }) => {
  await signInDemo(page);
  await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Campaigns", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Campaigns", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "snapchat", exact: true })).toBeVisible();
  await page.getByLabel("Platform", { exact: true }).selectOption("google");
  await expect(page.getByRole("cell", { name: "google", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "meta", exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Budget", exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-30");
  await page.getByLabel("End date", { exact: true }).fill("2026-10-01");
  await expect(page.locator("main").getByRole("alert")).toContainText("valid date range");
});

test("brand report links open the requested brand and show full P&L costs and read-only expenses", async ({ page }) => {
  await signInDemo(page);
  await page.goto(`/dashboard/profit?brandId=${DEMO_BRAND_IDS[1]}`);
  await expect(page.getByText("Terra Home · Revenue, costs, and profit")).toBeVisible();
  await expect(page.getByRole("button", { name: "Switch brand: Terra Home" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cost Breakdown", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add expense", exact: true })).toHaveCount(0);
  await expectNoOverflow(page);
  await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Campaigns", exact: true }).click();
  await expect(page.getByText("Terra Home · Campaign performance across connected ad accounts")).toBeVisible();
});

test("campaign and expense APIs require login and reject demo writes and cross-brand reads", async ({ page }) => {
  const base = `/api/brands/${DEMO_BRAND_IDS[0]}`;
  for (const path of ["campaigns", "expenses"]) expect((await page.request.get(`${base}/${path}`)).status()).toBe(401);
  await signInDemo(page);
  for (const method of ["POST", "PUT", "DELETE"]) {
    const response = await page.request.fetch(`${base}/expenses`, { method, data: { name: "Must not persist", amount: 10, frequency: "daily", startDate: "2026-10-15" } });
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toContain("read-only");
  }
  for (const path of ["campaigns", "expenses"]) expect((await page.request.get(`/api/brands/00000000-0000-4000-8000-000000000999/${path}`)).status()).toBe(403);
});
