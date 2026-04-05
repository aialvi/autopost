import { db } from "@/lib/db";
import { brandUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { BrandUserRole } from "@/lib/validators";

export async function hasBrandAccess(
  userId: string,
  brandId: string
): Promise<BrandUserRole | null> {
  const brandUser = await db.query.brandUsers.findFirst({
    where: (brandUsers, { and }) =>
      and(eq(brandUsers.userId, userId), eq(brandUsers.brandId, brandId)),
  });

  return brandUser?.role || null;
}

export async function canManageBrand(userId: string, brandId: string): Promise<boolean> {
  const role = await hasBrandAccess(userId, brandId);
  return role === "owner" || role === "manager";
}

export async function canEditBrand(userId: string, brandId: string): Promise<boolean> {
  const role = await hasBrandAccess(userId, brandId);
  return role === "owner" || role === "manager";
}

export async function isBrandOwner(userId: string, brandId: string): Promise<boolean> {
  const role = await hasBrandAccess(userId, brandId);
  return role === "owner";
}
