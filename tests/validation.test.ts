import test from "node:test";
import assert from "node:assert/strict";
import { registerSchema, loginSchema, getPasswordStrength } from "../src/lib/auth/utils";
import { createBrandSchema } from "../src/lib/validators/brand";
import { notificationSchema } from "../src/lib/validators/notification";
import { Webhook } from "standardwebhooks";
import { verifyPolarEvent, verifyTelegramSecret } from "../src/lib/webhooks/verify";

test("registration enforces password requirements and confirmation", () => {
  const valid = { name: "Visitor", email: "visitor@example.invalid", password: "ValidPass123!", confirmPassword: "ValidPass123!" };
  assert.ok(registerSchema.safeParse(valid).success);
  for (const password of ["short", "lowercase123", "UPPERCASE123", "NoNumbersHere"]) assert.equal(registerSchema.safeParse({ ...valid, password, confirmPassword: password }).success, false);
  assert.equal(registerSchema.safeParse({ ...valid, confirmPassword: "Mismatch123!" }).success, false);
  assert.equal(loginSchema.safeParse({ email: "not-email", password: valid.password }).success, false);
  assert.equal(getPasswordStrength(valid.password).score, 5);
});
test("brands reject invalid names, timezones, currencies and COGS", () => {
  assert.ok(createBrandSchema.safeParse({ name: "Test brand" }).success);
  for (const fields of [{ name: "x" }, { timezone: "Mars/Olympus" }, { currency: "usd" }, { defaultCogsPercentage: "-1" }, { defaultCogsPercentage: "101" }, { defaultCogsPercentage: "NaN" }, { defaultCogsPercentage: "" }]) assert.equal(createBrandSchema.safeParse({ name: "Test brand", ...fields }).success, false);
});
test("notification preferences validate limits and strip injected ownership fields", () => {
  const valid = { enabled: true, telegramChatId: null, alertOnLowRoas: true, alertOnSpendSpike: true, alertOnRevenueDrop: true, alertOnNewOrder: true, alertOnDailySummary: true, alertOnWeeklySummary: true, lowRoasThreshold: "1.5", spendSpikeThreshold: "50", revenueDropThreshold: "20", quietHoursStart: "22:30", quietHoursEnd: "07:15", timezone: "UTC" };
  const result = notificationSchema.parse({ ...valid, brandId: "injected", userId: "injected", id: "injected" });
  assert.equal("brandId" in result, false); assert.equal("userId" in result, false);
  for (const fields of [{ quietHoursStart: "24:00" }, { lowRoasThreshold: "-5" }, { timezone: "Invalid" }]) assert.equal(notificationSchema.safeParse({ ...valid, ...fields }).success, false);
});
test("billing webhooks verify raw payload, timestamp, event ID, and signature", () => {
  const secret = "polar_whs_test_only";
  const webhook = new Webhook(Buffer.from(secret).toString("base64"));
  const body = JSON.stringify({ type: "subscription.updated", data: { id: "test" } });
  const now = new Date();
  const headers = new Headers({ "webhook-id": "evt-test", "webhook-timestamp": String(Math.floor(now.getTime() / 1000)), "webhook-signature": webhook.sign("evt-test", now, body) });
  assert.equal(verifyPolarEvent(body, headers, secret), true);
  assert.equal(verifyPolarEvent(body + " ", headers, secret), false);
  assert.equal(verifyPolarEvent(body, headers, undefined), false);
  assert.equal(verifyPolarEvent(body, headers, "wrong-secret"), false);
  headers.set("webhook-timestamp", "1");
  assert.equal(verifyPolarEvent(body, headers, secret), false);
});
test("Telegram webhooks require a configured matching secret in every environment", () => {
  assert.equal(verifyTelegramSecret("test", "test"), true);
  for (const [header, secret] of [[null, "test"], ["test", undefined], ["wrong", "test"], ["", ""]] as const) assert.equal(verifyTelegramSecret(header, secret), false);
});
