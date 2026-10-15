import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, hasBrandAccess } from "@/lib/auth";
import { getDemoApiResponse } from "@/lib/demo/api";
import { campaignFilters, getCampaignReport } from "@/lib/platforms/ads/report";
import { DateRangeError } from "@/lib/profit/metrics";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const demo = getDemoApiResponse(session?.user?.id, req);
  if (demo) return demo;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  if (!await hasBrandAccess(session.user.id, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const filters = campaignFilters.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!filters.success) return NextResponse.json({ error: "Choose a valid date range, platform, and page." }, { status: 400 });
  try { return NextResponse.json(await getCampaignReport(id, filters.data)); }
  catch (error) {
    if (error instanceof DateRangeError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Campaign report failed", error);
    return NextResponse.json({ error: "Unable to load campaigns" }, { status: 500 });
  }
}
