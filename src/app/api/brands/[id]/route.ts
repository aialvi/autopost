import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brands, brandUsers } from "@/lib/db/schema";
import { updateBrandSchema, brandUserRoleSchema } from "@/lib/validators";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasBrandAccess } from "@/lib/auth/brand-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const brandAccess = await hasBrandAccess(session.user.id, id);
    if (!brandAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, id),
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json({ ...brand, userRole: brandAccess });
  } catch (error) {
    console.error("Error fetching brand:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const brandAccess = await hasBrandAccess(session.user.id, id);
    if (!brandAccess || brandAccess === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedFields = updateBrandSchema.safeParse({ ...body, id });

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedFields.error.flatten() },
        { status: 400 }
      );
    }

    const { name, timezone, currency, defaultCogsPercentage } =
      validatedFields.data;

    const [updatedBrand] = await db
      .update(brands)
      .set({
        ...(name !== undefined && { name }),
        ...(timezone !== undefined && { timezone }),
        ...(currency !== undefined && { currency }),
        ...(defaultCogsPercentage !== undefined && { defaultCogsPercentage }),
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();

    return NextResponse.json(updatedBrand);
  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const brandAccess = await hasBrandAccess(session.user.id, id);
    if (brandAccess !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(brands).where(eq(brands.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 500 }
    );
  }
}
