import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMultiBrandComparison } from "@/lib/dashboard/overview";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const brandIds = searchParams.get("brandIds")?.split(",");

  if (!brandIds || brandIds.length < 2) {
    return NextResponse.json(
      { error: "At least 2 brand IDs required for comparison" },
      { status: 400 }
    );
  }

  // Default to last 30 days
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const comparisons = await getMultiBrandComparison(brandIds, {
      startDate,
      endDate,
    });
    return NextResponse.json({ comparisons });
  } catch (error) {
    console.error("Error fetching brand comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand comparison" },
      { status: 500 }
    );
  }
}
