import { defineConfig, devices } from "@playwright/test";

const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalURL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testIgnore: "**/api.spec.ts", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: externalURL ? undefined : {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DEMO_ENABLED: "true",
      AUTH_SECRET: "automated-browser-tests-only-not-a-production-secret",
      DATABASE_URL: "postgresql://test:test@localhost:5432/autopost_test",
      GEMINI_API_KEY: "", ANTHROPIC_API_KEY: "", TELEGRAM_BOT_TOKEN: "",
      POLAR_WEBHOOK_SECRET: "", TELEGRAM_WEBHOOK_SECRET: "",
    },
  },
});
