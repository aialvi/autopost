import { z } from "zod";
import { createBrandSchema } from "./brand";
const threshold = z.string().refine((value) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0, "Use a non-negative threshold");
const quietTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable();
export const notificationSchema = z.object({
  enabled: z.boolean(), telegramChatId: z.string().max(255).nullable(),
  alertOnLowRoas: z.boolean(), alertOnSpendSpike: z.boolean(), alertOnRevenueDrop: z.boolean(), alertOnNewOrder: z.boolean(), alertOnDailySummary: z.boolean(), alertOnWeeklySummary: z.boolean(),
  lowRoasThreshold: threshold, spendSpikeThreshold: threshold, revenueDropThreshold: threshold,
  quietHoursStart: quietTime, quietHoursEnd: quietTime, timezone: createBrandSchema.shape.timezone,
});
