import { test, expect } from "@playwright/test";
import { signInDemo, expectNoOverflow } from "../helpers/demo";
import { DEMO_BRAND_IDS } from "../../src/lib/demo/config";

test("Shopify workspace shows products, refunds and linked ads on desktop and mobile", async ({ page }) => {
  await signInDemo(page);
  await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Brands", exact: true }).click();
  await page.getByRole("link", { name: "Shopify & Ads", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Shopify & ads" })).toBeVisible();
  await expect(page.getByText("Sample data · This demo is read-only.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync Shopify", exact: true })).toBeDisabled();
  await expect(page.getByText("Classic Sneakers", { exact: true })).toBeVisible();
  await expect(page.getByText("Not set — P&L uses estimate", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Everyday Collection 13", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Orders & refunds", exact: true }).click();
  await expect(page.getByText("Order #1043", { exact: true })).toBeVisible();
  await expect(page.getByText("Refund: $20.00", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Ads & posts", exact: true }).click();
  await expect(page.getByText("Product: Classic Sneakers", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View post", exact: false })).toHaveAttribute("href", "https://www.facebook.com/1000_5000");
  await expect(page.getByRole("button", { name: "Sync Meta ads", exact: true })).toBeDisabled();
  await expectNoOverflow(page);
});

test("Shopify workspace handles API failure and retry", async ({ page }) => {
  await signInDemo(page);
  let fail = true;
  await page.route(`**/api/brands/${DEMO_BRAND_IDS[0]}/shopify?*`, route => fail ? route.fulfill({ status: 500, json: { error: "Store temporarily unavailable" } }) : route.continue());
  await page.goto(`/dashboard/brands/${DEMO_BRAND_IDS[0]}/shopify`);
  await expect(page.getByRole("alert").filter({ hasText: "Store temporarily unavailable" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Classic Sneakers", { exact: true })).toBeVisible();
});
