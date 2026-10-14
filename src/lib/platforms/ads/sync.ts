import { revealSecret } from "../connection-secrets";
import { db } from "@/lib/db";
import { platformConnections, adCampaigns, adDataSnapshots, syncLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { MetaClient } from "../meta/client";
import { SnapchatClient } from "../snapchat/client";
import { GoogleAdsClient } from "../google/client";
import { TikTokClient } from "../tiktok/client";
import { snapshotId } from "./snapshot";
import { getDates } from "@/lib/profit/metrics";

type Platform = "meta" | "snapchat" | "google" | "tiktok";
export interface AdPlatformConfig {
  platform: Platform; accessToken: string; accountId: string; refreshToken?: string;
  clientId?: string; clientSecret?: string; developerToken?: string; customerId?: string;
  appId?: string; appSecret?: string;
}
type Performance = { spend: number; impressions: number; clicks: number; conversions: number; revenue: number };
type Campaign = { id: string; name: string; status: string; objective?: string; dailyBudget?: string | null };

export async function syncAdData(brandId: string, config: AdPlatformConfig, date: string) {
  getDates({ startDate: date, endDate: date });
  config = { ...config, accessToken: revealSecret(config.accessToken), refreshToken: config.refreshToken ? revealSecret(config.refreshToken) : undefined, clientSecret: config.clientSecret ? revealSecret(config.clientSecret) : undefined, appSecret: config.appSecret ? revealSecret(config.appSecret) : undefined };
  let campaigns: Campaign[];
  let performance: (campaignId: string) => Promise<Performance>;
  switch (config.platform) {
    case "meta": {
      const client = new MetaClient({ accessToken: config.accessToken });
      campaigns = (await client.getCampaigns(config.accountId)).map((campaign) => ({ id: campaign.id, name: campaign.name, status: campaign.status.toLowerCase(), objective: campaign.objective, dailyBudget: campaign.daily_budget ? (Number(campaign.daily_budget) / 100).toFixed(2) : null }));
      performance = async (id) => {
        const rows = await client.getInsights("campaign", id, date, date);
        return rows.reduce((sum, row) => ({ spend: sum.spend + Number(row.spend), impressions: sum.impressions + Number(row.impressions), clicks: sum.clicks + Number(row.clicks), conversions: sum.conversions + MetaClient.getConversionCount(row), revenue: sum.revenue + MetaClient.getConversionValue(row) }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
      };
      break;
    }
    case "snapchat": {
      const client = new SnapchatClient({ ...config, clientId: config.clientId ?? "", clientSecret: config.clientSecret ?? "" });
      campaigns = (await client.getCampaigns(config.accountId)).map((campaign) => ({ id: campaign.id, name: campaign.name, status: campaign.status.toLowerCase(), objective: campaign.objective, dailyBudget: campaign.daily_budget_micro ? (campaign.daily_budget_micro / 1e6).toFixed(2) : null }));
      performance = async (id) => { const stats = await client.getStats("campaign", id, date, date); return { spend: stats.spend, impressions: stats.impressions, clicks: stats.swipes, conversions: stats.conversions, revenue: stats.revenue }; };
      break;
    }
    case "google": {
      const client = new GoogleAdsClient({ developerToken: config.developerToken ?? "", clientId: config.clientId ?? "", clientSecret: config.clientSecret ?? "", refreshToken: config.refreshToken ?? "", customerId: config.accountId });
      campaigns = (await client.getCampaigns()).map((campaign) => ({ id: campaign.id, name: campaign.name, status: campaign.status.toLowerCase(), objective: campaign.advertising_channel_type }));
      performance = async (id) => (await client.getStats("campaign", date, date, id)).reduce((sum, row) => ({ spend: sum.spend + GoogleAdsClient.microsToDollars(row.cost_micros), impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks, conversions: sum.conversions + row.conversions, revenue: sum.revenue + row.conversions_value }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
      break;
    }
    case "tiktok": {
      const client = new TikTokClient({ accessToken: config.accessToken, appId: config.appId ?? "", appSecret: config.appSecret ?? "" });
      campaigns = (await client.getCampaigns(config.accountId)).map((campaign) => ({ id: String(campaign.campaign_id), name: campaign.campaign_name, status: campaign.status === "ENABLE" ? "active" : campaign.status.toLowerCase(), objective: campaign.objective, dailyBudget: Number(campaign.budget).toFixed(2) }));
      performance = async (id) => (await client.getStats(config.accountId, "CAMPAIGN", [id], date, date)).reduce((sum, row) => ({ spend: sum.spend + row.spend, impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks, conversions: sum.conversions + row.conversions, revenue: sum.revenue + row.revenue }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
      break;
    }
    default: throw new Error("Unsupported ad platform");
  }
  let snapshots = 0;
  let errors = 0;
  for (const campaign of campaigns) {
    try {
      const values = { brandId, platform: config.platform, platformCampaignId: campaign.id, name: campaign.name, status: campaign.status, objective: campaign.objective, dailyBudget: campaign.dailyBudget, updatedAt: new Date() };
      const [saved] = await db.insert(adCampaigns).values(values).onConflictDoUpdate({ target: [adCampaigns.brandId, adCampaigns.platform, adCampaigns.platformCampaignId], set: { name: values.name, status: values.status, objective: values.objective, dailyBudget: values.dailyBudget, updatedAt: values.updatedAt } }).returning({ id: adCampaigns.id });
      const stats = await performance(campaign.id);
      if (![stats.spend, stats.revenue, stats.impressions, stats.clicks, stats.conversions].every(Number.isFinite)) throw new Error("Platform returned invalid metrics");
      const record = { brandId, platform: config.platform, campaignId: saved.id, date, spend: stats.spend.toFixed(2), revenueReported: stats.revenue.toFixed(2), impressions: Math.round(stats.impressions), clicks: Math.round(stats.clicks), conversions: Math.round(stats.conversions) };
      await db.insert(adDataSnapshots).values({ id: snapshotId(brandId, config.platform, saved.id, date), ...record }).onConflictDoUpdate({ target: adDataSnapshots.id, set: record });
      snapshots++;
    } catch (error) {
      errors++;
      console.error("Campaign sync failed", config.platform, campaign.id, error instanceof Error ? error.message : "Unknown error");
    }
  }
  if (errors === 0) await db.update(platformConnections).set({ lastSyncedAt: new Date() }).where(and(eq(platformConnections.brandId, brandId), eq(platformConnections.platform, config.platform)));
  return { campaigns: campaigns.length, adSets: 0, ads: 0, snapshots, errors };
}

export async function logSync(brandId: string, platform: string, syncType: "ad_data" | "orders" | "products" | "token_refresh", status: "started" | "success" | "failed" | "partial", recordsProcessed: number, errorMessage?: string) {
  const [log] = await db.insert(syncLogs).values({ brandId, platform, syncType, status, recordsProcessed, errorMessage, startedAt: new Date(), completedAt: status === "started" ? null : new Date() }).returning({ id: syncLogs.id });
  return log.id;
}
