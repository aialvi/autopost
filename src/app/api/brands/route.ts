import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brands, brandUsers } from "@/lib/db/schema";
import { createBrandSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generateUniqueSlug } from "@/lib/utils/slug";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all brands the user has access to
    const userBrands = await db.query.brandUsers.findMany({
      where: eq(brandUsers.userId, session.user.id),
      with: {
        brand: true,
      },
    });

    return NextResponse.json(
      userBrands.map((ub) => ({
        ...ub.brand,
        userRole: ub.role,
      }))
    );
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const validatedFields = createBrandSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedFields.error.flatten() },
        { status: 400 }
      );
    }

    const { name, timezone, currency, defaultCogsPercentage } =
      validatedFields.data;

    // Generate unique slug from name
    const allBrands = await db.query.brands.findMany({
      columns: { slug: true },
    });
    const existingSlugs = allBrands.map((b) => b.slug);
    const slug = generateUniqueSlug(name.toLowerCase().replace(/\s+/g, "-"), existingSlugs);

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

    return NextResponse.json(newBrand, { status: 201 });
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
