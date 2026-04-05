import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters").max(50),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  timezone: z.string().default("UTC"),
  currency: z.string().default("USD"),
  defaultCogsPercentage: z.string().default("0.00"),
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
