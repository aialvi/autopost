import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters").max(50),
  timezone: z.string().refine((value) => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; } }, "Choose a valid timezone").default("UTC"),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code").default("USD"),
  defaultCogsPercentage: z.string().refine((value) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100, "Product cost must be between 0 and 100 percent").default("0.00"),
});

export const updateBrandSchema = createBrandSchema.partial().extend({
  id: z.string().uuid(),
});

export const brandUserRoleSchema = z.enum(["owner", "manager", "viewer"]);

export const addBrandUserSchema = z.object({
  brandId: z.string().uuid(),
  userId: z.string().uuid(),
  role: brandUserRoleSchema,
});

export const updateBrandUserRoleSchema = z.object({
  brandId: z.string().uuid(),
  userId: z.string().uuid(),
  role: brandUserRoleSchema,
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type BrandUserRole = z.infer<typeof brandUserRoleSchema>;
export type AddBrandUserInput = z.infer<typeof addBrandUserSchema>;
