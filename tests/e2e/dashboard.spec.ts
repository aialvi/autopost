import { test, expect } from "@playwright/test";
import { signInDemo, expectNoOverflow } from "../helpers/demo";

test.beforeEach(async ({ page }) => { await signInDemo(page); });

test("overview shows five integrations, shared branding, role badge and brand comparison", async ({ page }) => {
  await expect(page.getByText("Connected", { exact: true })).toHaveCount(5);
  const headerLightness = await page.locator("header").evaluate(el => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    context.fillStyle = getComputedStyle(el).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
  });
  expect(headerLightness.every(value => value > 240)).toBe(true);
  await expect(page.getByRole("link", { name: "AutoPost dashboard", exact: true }).locator("svg")).toBeVisible();
  const title = page.getByRole("heading", { name: "Northstar Apparel", exact: true });
  await expect(title.locator("..")).toHaveCSS("display", "flex");
  await expect(title.locator("..").getByText("viewer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Compare Brands" }).click();
  await page.locator("#brand-comparison").getByRole("button", { name: /Terra Home/ }).click();
  await page.getByRole("button", { name: "Compare (2 brands)" }).click();
  await expect(page.getByText("Brand Comparison", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
});

test("brand switching persists across reports and settings remain read-only", async ({ page }) => {
  await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Brands", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open dashboard" })).toHaveCount(3);
  await page.getByRole("button", { name: "Open dashboard" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Terra Home", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Switch brand:/ }).click();
  await page.getByRole("menuitem").filter({ hasText: "Bloom Skincare" }).click();
  await expect(page.getByRole("heading", { name: "Bloom Skincare", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bloom Skincare", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Brands", exact: true }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).first().click();
  await expect(page.getByLabel("Brand Name")).toBeDisabled();
  await expect(page.getByText("sample-meta-account", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
});

for (const tab of [
  { label: "Profit", path: "profit", content: "Profit Over Time" },
  { label: "Attribution", path: "attribution", content: "Top Campaigns by Attribution" },
  { label: "AI insights", path: "ai", content: "Revenue is growing while profit stays healthy" },
  { label: "Notifications", path: "notifications", content: "Daily performance summary" },
  { label: "Billing", path: "billing", content: "Subscription Status" },
]) {
  test(`${tab.label} is populated and marks the correct tab active`, async ({ page }) => {
    const link = page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: tab.label, exact: true });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${tab.path}$`));
    await expect(page.getByText(tab.content, { exact: true }).first()).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
    if (tab.path === "notifications") {
      await expect(page.getByLabel("Telegram Chat ID")).toBeDisabled();
      const next = page.getByRole("button", { name: "Next", exact: true });
      await next.click();
      await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Previous", exact: true }).click();
      await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
    }
    if (tab.path === "billing") await expect(page.getByText("$99.00", { exact: true }).first()).toBeVisible();
    await expectNoOverflow(page);
  });
}

test("attribution models and CAPI platform filters change report data", async ({ page }) => {
  await page.goto("/dashboard/attribution");
  await page.getByRole("combobox", { name: "Attribution model" }).click();
  await page.getByRole("option", { name: "First Click", exact: true }).click();
  await expect(page.getByText(/using First Click/)).toBeVisible();
  await page.getByRole("combobox", { name: "CAPI platform" }).click();
  const response = page.waitForResponse(res => res.url().includes("/capi?platform=meta") && res.status() === 200);
  await page.getByRole("option", { name: "Meta", exact: true }).click();
  const filtered = await (await response).json();
  expect(filtered.events.every((event: { platform: string }) => event.platform === "meta")).toBe(true);
});

test("report failures show retry feedback and preserve filter controls", async ({ page }) => {
  await page.route("**/api/brands/*/profit?**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Test service unavailable" }) }));
  await page.goto("/dashboard/profit");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: /Retry|Try again/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Profit granularity" })).toBeVisible();
});
