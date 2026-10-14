import { test, expect } from "@playwright/test";
import { expectNoOverflow } from "../helpers/demo";

test("homepage has complete sections, working links, and loaded preview images", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  for (const id of ["features", "how-it-works", "integrations", "benefits"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
  for (const name of ["Shopify", "Meta Ads", "Google Ads", "TikTok Ads", "Snapchat Ads", "Telegram"]) await expect(page.locator("#integrations").getByText(name, { exact: true })).toBeVisible();
  for (const image of await page.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoOverflow(page);
  }
  expect(errors).toEqual([]);
});

test("navigation anchors, mobile disclosure and keyboard dismissal work", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    const menu = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(menu).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(menu).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  } else {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Features" }).click();
    await expect(page).toHaveURL(/#features$/);
  }
});

test("FAQ expands and demo CTA prefills the login form", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Can I explore before connecting my accounts?", { exact: true }).click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  await page.getByRole("link", { name: "Explore the demo", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login\?demo=1$/);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("demo@autopost.app");
});

test("landing page remains readable with JavaScript disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).locator("..")).toHaveCSS("opacity", "1");
    await expect(page.getByRole("link", { name: "Create an account", exact: true }).first()).toHaveAttribute("href", "/register");
  } finally { await context.close(); }
});
