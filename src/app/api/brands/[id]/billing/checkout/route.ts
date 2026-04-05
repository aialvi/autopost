import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasBrandAccess } from "@/lib/auth";
import { createSubscriptionCheckout } from "@/lib/payments/management";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST - Create checkout session for subscription
 */
export async function POST(
  req: Request,
  { params }: RouteContext
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: brandId } = await params;

  const role = await hasBrandAccess(session.user.id, brandId);
  if (role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tier, userEmail } = body;

    if (!tier || !userEmail) {
      return NextResponse.json(
        { error: "tier and userEmail are required" },
        { status: 400 }
      );
    }

    const result = await createSubscriptionCheckout(brandId, tier, userEmail);

    if (result) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating checkout:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
