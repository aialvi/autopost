import { expect, type Page } from "@playwright/test";

export async function signInDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Fill demo credentials" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("demo@autopost.app");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("DemoPass123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("You’re exploring the demo workspace")).toBeVisible();
}

export async function expectNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
