"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brands, brandUsers } from "@/lib/db/schema";
import { createBrandSchema, updateBrandSchema } from "@/lib/validators";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { hasBrandAccess } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getUserBrands() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const userBrands = await db.query.brandUsers.findMany({
      where: eq(brandUsers.userId, session.user.id),
      with: {
        brand: true,
      },
    });

    return {
      brands: userBrands.map((ub) => ({
        ...ub.brand,
        userRole: ub.role,
      })),
    };
  } catch (error) {
    console.error("Error fetching brands:", error);
    return { error: "Failed to fetch brands" };
  }
}

export async function getBrand(brandId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const brandAccess = await hasBrandAccess(session.user.id, brandId);
    if (!brandAccess) {
      return { error: "Forbidden" };
    }

    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, brandId),
    });

    if (!brand) {
      return { error: "Brand not found" };
    }

    return { brand, userRole: brandAccess };
  } catch (error) {
    console.error("Error fetching brand:", error);
    return { error: "Failed to fetch brand" };
  }
}

export async function createBrand(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const name = formData.get("name") as string;
    const timezone = (formData.get("timezone") as string) || "UTC";
    const currency = (formData.get("currency") as string) || "USD";
    const defaultCogsPercentage =
      (formData.get("defaultCogsPercentage") as string) || "0.00";

    const validatedFields = createBrandSchema.safeParse({
      name,
      timezone,
      currency,
      defaultCogsPercentage,
    });

    if (!validatedFields.success) {
      return { error: "Invalid input", details: validatedFields.error.flatten() };
    }

    // Generate unique slug from name
    const allBrands = await db.query.brands.findMany({
      columns: { slug: true },
    });
    const existingSlugs = allBrands.map((b) => b.slug);
    const slug = generateUniqueSlug(
      name.toLowerCase().replace(/\s+/g, "-"),
      existingSlugs
    );

    // Create brand
    const [newBrand] = await db
      .insert(brands)
      .values({
        name,
        slug,
        timezone,
        currency,
        defaultCogsPercentage,
      })
      .returning();

    // Add user as owner
    await db.insert(brandUsers).values({
      brandId: newBrand.id,
      userId: session.user.id,
      role: "owner",
    });

    revalidatePath("/dashboard");
    redirect(`/dashboard/brands/${newBrand.id}`);
  } catch (error) {
    console.error("Error creating brand:", error);
    return { error: "Failed to create brand" };
  }
}

export async function updateBrand(brandId: string, formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const brandAccess = await hasBrandAccess(session.user.id, brandId);
    if (!brandAccess || brandAccess === "viewer") {
      return { error: "Forbidden" };
    }

    const name = formData.get("name") as string;
    const timezone = formData.get("timezone") as string;
    const currency = formData.get("currency") as string;
    const defaultCogsPercentage = formData.get("defaultCogsPercentage") as string;

    const validatedFields = updateBrandSchema.safeParse({
      id: brandId,
      name,
      timezone,
      currency,
      defaultCogsPercentage,
    });

    if (!validatedFields.success) {
      return { error: "Invalid input", details: validatedFields.error.flatten() };
    }

    const [updatedBrand] = await db
      .update(brands)
      .set({
        name,
        timezone,
        currency,
        defaultCogsPercentage,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, brandId))
      .returning();

    revalidatePath(`/dashboard/brands/${brandId}`);
    return { brand: updatedBrand };
  } catch (error) {
    console.error("Error updating brand:", error);
    return { error: "Failed to update brand" };
  }
}

export async function deleteBrand(brandId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const brandAccess = await hasBrandAccess(session.user.id, brandId);
    if (brandAccess !== "owner") {
      return { error: "Forbidden - only owners can delete brands" };
    }

    await db.delete(brands).where(eq(brands.id, brandId));

    revalidatePath("/dashboard");
    redirect("/dashboard/brands");
  } catch (error) {
    console.error("Error deleting brand:", error);
    return { error: "Failed to delete brand" };
  }
}

export async function setCurrentBrand(brandId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const brandAccess = await hasBrandAccess(session.user.id, brandId);
    if (!brandAccess) {
      return { error: "Forbidden" };
    }

    // In a real app, this would set the brand in user preferences
    // For now, we'll redirect to the brand dashboard
    redirect(`/dashboard/brands/${brandId}`);
  } catch (error) {
    console.error("Error setting current brand:", error);
    return { error: "Failed to set current brand" };
  }
}
