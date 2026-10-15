import { z } from "zod";

const date = z.iso.date();
export const expenseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.number().finite().positive().max(99999999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use at most two decimal places"),
  frequency: z.enum(["one_time", "daily", "weekly", "monthly"]),
  startDate: date,
  endDate: date.nullable().default(null),
}).refine(value => !value.endDate || value.endDate >= value.startDate, "End date must follow start date");
