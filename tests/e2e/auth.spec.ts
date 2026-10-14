import { test, expect } from "@playwright/test";
import { signInDemo, expectNoOverflow } from "../helpers/demo";

test("protected dashboard redirects visitors to login", async ({ page }) => {
  await page.goto("/dashboard/profit");
  await expect(page).toHaveURL(/\/login/);
});

test("registration reports weak password inline and preserves entered values", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill("Demo Visitor");
  await page.getByLabel("Email", { exact: true }).fill("visitor@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("weakpassword");
  await page.getByLabel("Confirm password", { exact: true }).fill("weakpassword");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#password-error")).toContainText("uppercase");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("visitor@example.invalid");
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole("button", { name: "Show passwords" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await expectNoOverflow(page);
});

test("registration rejects mismatched passwords and offers demo entry", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill("Visitor");
  await page.getByLabel("Email", { exact: true }).fill("visitor@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("ValidPass123!");
  await page.getByLabel("Confirm password", { exact: true }).fill("OtherPass123!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator("#confirmPassword-error")).toContainText("Passwords do not match");
  await page.getByRole("link", { name: "Try the demo account" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("DemoPass123!");
});

test("demo login and signout clear authentication and active brand", async ({ page, context }) => {
  await signInDemo(page);
  await expect(page.getByRole("link", { name: "AutoPost dashboard", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).some(cookie => cookie.name === "currentBrandId")).toBe(false);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("server registration rejects weak passwords without a redirect when JavaScript is disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/register");
    await page.getByLabel("Name", { exact: true }).fill("Visitor");
    await page.getByLabel("Email", { exact: true }).fill("visitor@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("weakpassword");
    await page.getByLabel("Confirm password", { exact: true }).fill("weakpassword");
    const response = page.waitForResponse(res => res.request().method() === "POST" && new URL(res.url()).pathname === "/register");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(page.locator("#password-error")).toContainText("uppercase");
    await expect(page).toHaveURL(/\/register$/);
  } finally { await context.close(); }
});
