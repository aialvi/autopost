import { timingSafeEqual } from "node:crypto";
export function isAuthorizedCron(request: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
