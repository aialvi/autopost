import { db } from "@/lib/db";
import { adCampaigns, adDataSnapshots } from "@/lib/db/schema";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDates } from "@/lib/profit/metrics";
import { getPlatformProfitBreakdown } from "@/lib/profit/calculations";

export const campaignFilters = z.object({ startDate: z.iso.date(), endDate: z.iso.date(), platform: z.enum(["all", "meta", "google", "tiktok", "snapchat"]).default("all"), page: z.coerce.number().int().min(1).max(10000).default(1) });
export type CampaignFilters = z.infer<typeof campaignFilters>;
export async function getCampaignReport(brandId: string, filters: CampaignFilters) {
  getDates(filters);
  const where = and(eq(adCampaigns.brandId, brandId), filters.platform === "all" ? undefined : eq(adCampaigns.platform, filters.platform));
  const rows = await db.select({
    id: adCampaigns.id, name: adCampaigns.name, platform: adCampaigns.platform, status: adCampaigns.status,
    dailyBudget: adCampaigns.dailyBudget, lifetimeBudget: adCampaigns.lifetimeBudget,
    updatedAt: adCampaigns.updatedAt,
    spend: sql<number>`coalesce(sum(${adDataSnapshots.spend}),0)::float`,
    revenue: sql<number>`coalesce(sum(${adDataSnapshots.revenueReported}),0)::float`,
    impressions: sql<number>`coalesce(sum(${adDataSnapshots.impressions}),0)::float`,
    clicks: sql<number>`coalesce(sum(${adDataSnapshots.clicks}),0)::float`,
    conversions: sql<number>`coalesce(sum(${adDataSnapshots.conversions}),0)::float`,
    syncedDays: sql<number>`count(distinct ${adDataSnapshots.date})::int`,
  }).from(adCampaigns).leftJoin(adDataSnapshots, and(eq(adCampaigns.id, adDataSnapshots.campaignId), eq(adDataSnapshots.brandId, brandId), gte(adDataSnapshots.date, filters.startDate), lte(adDataSnapshots.date, filters.endDate)))
    .where(where).groupBy(adCampaigns.id).orderBy(desc(sql`coalesce(sum(${adDataSnapshots.spend}),0)`), adCampaigns.id).limit(25).offset((filters.page - 1) * 25);
  const [total] = await db.select({ count: count() }).from(adCampaigns).where(where);
  return { campaigns: rows.map(row => ({ ...row, updatedAt: row.updatedAt.toISOString(), roas: row.spend > 0 ? row.revenue / row.spend : 0 })), total: total.count, page: filters.page, pageSize: 25, breakdown: await getPlatformProfitBreakdown(brandId, filters) };
}
export type CampaignReport = Awaited<ReturnType<typeof getCampaignReport>>;
