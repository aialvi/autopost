import { Webhook } from "standardwebhooks";
import { timingSafeEqual } from "node:crypto";

export function verifyPolarEvent(body: string, headers: Headers, secret: string | undefined): boolean {
  if (!secret) return false;
  try {
    // Polar signs with the literal secret bytes, per its official SDK.
    new Webhook(Buffer.from(secret, "utf8").toString("base64")).verify(body, Object.fromEntries(headers));
    return true;
  } catch { return false; }
}

export function verifyTelegramSecret(header: string | null, secret: string | undefined): boolean {
  if (!header || !secret) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
