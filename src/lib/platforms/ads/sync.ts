import { db } from "@/lib/db";
import {
  platformConnections,
  adCampaigns,
  adSets,
  ads,
  adDataSnapshots,
  syncLogs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { MetaClient } from "../meta/client";
import { SnapchatClient } from "../snapchat/client";
import { GoogleAdsClient } from "../google/client";
import { TikTokClient } from "../tiktok/client";

type Platform = "meta" | "snapchat" | "google" | "tiktok";

export interface AdPlatformConfig {
  platform: Platform;
  accessToken: string;
  accountId: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  developerToken?: string;
  customerId?: string;
  appId?: string;
  appSecret?: string;
}

export async function syncAdData(
  brandId: string,
  config: AdPlatformConfig,
  date: string
): Promise<{ campaigns: number; adSets: number; ads: number; snapshots: number; errors: number }> {
  let campaigns = 0;
  let adSets = 0;
  let ads_count = 0;
  let snapshots = 0;
  let errors = 0;

  try {
    switch (config.platform) {
      case "meta":
        const metaResult = await syncMetaData(brandId, config as AdPlatformConfig & { platform: "meta" }, date);
        campaigns = metaResult.campaigns;
        adSets = metaResult.adSets;
        ads_count = metaResult.ads;
        snapshots = metaResult.snapshots;
        errors = metaResult.errors;
        break;

      case "snapchat":
        const snapchatResult = await syncSnapchatData(brandId, config as AdPlatformConfig & { platform: "snapchat" }, date);
        campaigns = snapchatResult.campaigns;
        ads_count = snapchatResult.ads;
        snapshots = snapchatResult.snapshots;
        errors = snapchatResult.errors;
        break;

      case "google":
        const googleResult = await syncGoogleData(brandId, config as AdPlatformConfig & { platform: "google" }, date);
        campaigns = googleResult.campaigns;
        ads_count = googleResult.ads;
        snapshots = googleResult.snapshots;
        errors = googleResult.errors;
        break;

      case "tiktok":
        const tiktokResult = await syncTikTokData(brandId, config as AdPlatformConfig & { platform: "tiktok" }, date);
        campaigns = tiktokResult.campaigns;
        ads_count = tiktokResult.ads;
        snapshots = tiktokResult.snapshots;
        errors = tiktokResult.errors;
        break;
    }

    // Update last synced time
    await db
      .update(platformConnections)
      .set({ lastSyncedAt: new Date() })
      .where(
        and(
          eq(platformConnections.brandId, brandId),
          eq(platformConnections.platform, config.platform)
        )
      );
  } catch (error) {
    console.error(`Error syncing ${config.platform} data:`, error);
    errors++;
  }

  return { campaigns, adSets, ads: ads_count, snapshots, errors };
}

async function syncMetaData(
  brandId: string,
  config: AdPlatformConfig & { platform: "meta" },
  date: string
): Promise<{ campaigns: number; adSets: number; ads: number; snapshots: number; errors: number }> {
  const client = new MetaClient({ accessToken: config.accessToken });
  let campaigns = 0;
  let adsetCount = 0;
  let adCount = 0;
  let snapshots = 0;
  let errors = 0;

  try {
    const metaCampaigns = await client.getCampaigns(config.accountId);

    for (const mc of metaCampaigns) {
      try {
        const existing = await db.query.adCampaigns.findFirst({
          where: and(
            eq(adCampaigns.brandId, brandId),
            eq(adCampaigns.platformCampaignId, mc.id)
          ),
        });

        let campaignId: string;
        if (!existing) {
          const [newCampaign] = await db
            .insert(adCampaigns)
            .values({
              brandId,
              platform: "meta",
              platformCampaignId: mc.id,
              name: mc.name,
              status: mc.status,
              objective: mc.objective,
              dailyBudget: mc.daily_budget || null,
              lifetimeBudget: mc.lifetime_budget || null,
            })
            .returning();
          campaignId = newCampaign.id;
          campaigns++;
        } else {
          await db
            .update(adCampaigns)
            .set({
              name: mc.name,
              status: mc.status,
              updatedAt: new Date(),
            })
            .where(eq(adCampaigns.id, existing.id));
          campaignId = existing.id;
        }

        // Sync ad sets
        const metaAdSets = await client.getAdSets(mc.id);
        for (const mas of metaAdSets) {
          const existingAdSet = await db.query.adSets.findFirst({
            where: (table, { eq }) => eq(table.platformAdsetId, mas.id),
          });

          let adSetId: string;
          if (!existingAdSet) {
            const [newAdSet] = await db
              .insert(adSets)
              .values({
                campaignId,
                platformAdsetId: mas.id,
                name: mas.name,
                status: mas.status,
              })
              .returning();
            adSetId = newAdSet.id;
            adsetCount++;
          } else {
            adSetId = existingAdSet.id;
          }

          // Sync ads
          const metaAds = await client.getAds(mas.id);
          for (const ma of metaAds) {
            const existingAd = await db.query.ads.findFirst({
              where: (table, { eq }) => eq(table.platformAdId, ma.id),
            });

            if (!existingAd) {
              await db.insert(ads).values({
                adsetId: adSetId,
                platformAdId: ma.id,
                name: ma.name,
                status: ma.status,
                creativeThumbnail: ma.creative?.thumbnail_url || null,
              });
              adCount++;
            }
          }
        }

        // Get insights for the campaign
        try {
          const insights = await client.getInsights(
            "campaign",
            mc.id,
            date,
            date
          );

          if (insights.length > 0) {
            for (const insight of insights) {
              await db.insert(adDataSnapshots).values({
                brandId,
                platform: "meta",
                campaignId,
                date,
                spend: insight.spend.toString(),
                impressions: insight.impressions,
                clicks: insight.clicks,
                conversions: MetaClient.getConversionCount(insight),
                cpm: MetaClient.calculateCPM(insight).toString(),
                cpc: MetaClient.calculateCPC(insight).toString(),
                ctr: MetaClient.calculateCTR(insight).toString(),
              }).onConflictDoNothing();
              snapshots++;
            }
          }
        } catch (err) {
          console.error(`Error fetching insights for campaign ${mc.id}:`, err);
          // Non-fatal, continue
        }
      } catch (err) {
        console.error(`Error syncing campaign ${mc.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("Error fetching Meta campaigns:", err);
    throw err;
  }

  return { campaigns, adSets: adsetCount, ads: adCount, snapshots, errors };
}

async function syncSnapchatData(
  brandId: string,
  config: AdPlatformConfig & { platform: "snapchat" },
  date: string
): Promise<{ campaigns: number; adSets: number; ads: number; snapshots: number; errors: number }> {
  const client = new SnapchatClient({
    clientId: config.clientId!,
    clientSecret: config.clientSecret!,
    accessToken: config.accessToken,
  });

  let campaigns = 0;
  let adCount = 0;
  let snapshots = 0;
  let errors = 0;

  try {
    const snapCampaigns = await client.getCampaigns();

    for (const sc of snapCampaigns) {
      try {
        const existing = await db.query.adCampaigns.findFirst({
          where: and(
            eq(adCampaigns.brandId, brandId),
            eq(adCampaigns.platformCampaignId, sc.id.toString())
          ),
        });

        let campaignId: string;
        if (!existing) {
          const [newCampaign] = await db
            .insert(adCampaigns)
            .values({
              brandId,
              platform: "snapchat",
              platformCampaignId: sc.id.toString(),
              name: sc.name,
              status: sc.status.description,
              objective: sc.objective.description,
              dailyBudget: (sc.daily_budget_micro / 1_000_000).toString(),
            })
            .returning();
          campaignId = newCampaign.id;
          campaigns++;
        } else {
          campaignId = existing.id;
        }

        // Get ads for this campaign
        const snapAds = await client.getAds(sc.id);
        for (const sa of snapAds) {
          const existingAd = await db.query.ads.findFirst({
            where: (table, { eq }) => eq(table.platformAdId, sa.id.toString()),
          });

          if (!existingAd) {
            await db.insert(ads).values({
              campaignId,
              platformAdId: sa.id.toString(),
              name: sa.name,
              status: sa.status.description,
              creativeThumbnail: sa.preview_url || null,
            });
            adCount++;
          }
        }

        // Get stats
        try {
          const stats = await client.getStats("campaign", sc.id, date, date);
          if (stats) {
            await db.insert(adDataSnapshots).values({
              brandId,
              platform: "snapchat",
              campaignId,
              date,
              spend: stats.spend.toString(),
              impressions: stats.impressions,
              clicks: stats.swipes,
              conversions: stats.conversions,
            }).onConflictDoNothing();
            snapshots++;
          }
        } catch (err) {
          console.error(`Error fetching stats for campaign ${sc.id}:`, err);
        }
      } catch (err) {
        console.error(`Error syncing campaign ${sc.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("Error fetching Snapchat campaigns:", err);
    throw err;
  }

  return { campaigns, adSets: 0, ads: adCount, snapshots, errors };
}

async function syncGoogleData(
  brandId: string,
  config: AdPlatformConfig & { platform: "google" },
  date: string
): Promise<{ campaigns: number; adSets: number; ads: number; snapshots: number; errors: number }> {
  const client = new GoogleAdsClient({
    developerToken: config.developerToken!,
    clientId: config.clientId!,
    clientSecret: config.clientSecret!,
    refreshToken: config.refreshToken!,
    customerId: config.accountId,
  });

  let campaigns = 0;
  let adCount = 0;
  let snapshots = 0;
  let errors = 0;

  try {
    const googleCampaigns = await client.getCampaigns();

    for (const gc of googleCampaigns) {
      try {
        const existing = await db.query.adCampaigns.findFirst({
          where: and(
            eq(adCampaigns.brandId, brandId),
            eq(adCampaigns.platformCampaignId, gc.id)
          ),
        });

        let campaignId: string;
        if (!existing) {
          const [newCampaign] = await db
            .insert(adCampaigns)
            .values({
              brandId,
              platform: "google",
              platformCampaignId: gc.id,
              name: gc.name,
              status: gc.status,
            })
            .returning();
          campaignId = newCampaign.id;
          campaigns++;
        } else {
          campaignId = existing.id;
        }

        // Get stats
        try {
          const statsArray = await client.getStats("campaign", date, date);
          if (statsArray.length > 0) {
            const stats = statsArray[0];
            await db.insert(adDataSnapshots).values({
              brandId,
              platform: "google",
              campaignId,
              date,
              spend: GoogleAdsClient.microsToDollars(stats.cost_micros).toString(),
              impressions: stats.impressions,
              clicks: stats.clicks,
              conversions: stats.conversions,
            }).onConflictDoNothing();
            snapshots++;
          }
        } catch (err) {
          console.error(`Error fetching stats for campaign ${gc.id}:`, err);
        }
      } catch (err) {
        console.error(`Error syncing campaign ${gc.id}:`, err);
        errors++;
      }
    }

    // Sync ads
    const googleAds = await client.getAds();
    for (const ga of googleAds) {
      const existingAd = await db.query.ads.findFirst({
        where: (table, { eq }) => eq(table.platformAdId, ga.id),
      });

      if (!existingAd) {
        await db.insert(ads).values({
          platformAdId: ga.id,
          name: ga.name,
          status: ga.status,
        });
        adCount++;
      }
    }
  } catch (err) {
    console.error("Error fetching Google Ads campaigns:", err);
    throw err;
  }

  return { campaigns, adSets: 0, ads: adCount, snapshots, errors };
}

async function syncTikTokData(
  brandId: string,
  config: AdPlatformConfig & { platform: "tiktok" },
  date: string
): Promise<{ campaigns: number; adSets: number; ads: number; snapshots: number; errors: number }> {
  const client = new TikTokClient({
    appId: config.appId!,
    appSecret: config.appSecret!,
    accessToken: config.accessToken,
  });

  let campaigns = 0;
  let adCount = 0;
  let snapshots = 0;
  let errors = 0;

  try {
    const accounts = await client.getAdAccounts();
    if (accounts.length === 0) {
      throw new Error("No TikTok ad accounts found");
    }

    const advertiserId = accounts[0].advertiser_id;
    const tiktokCampaigns = await client.getCampaigns(Number(advertiserId));

    for (const tc of tiktokCampaigns) {
      try {
        const existing = await db.query.adCampaigns.findFirst({
          where: and(
            eq(adCampaigns.brandId, brandId),
            eq(adCampaigns.platformCampaignId, tc.campaign_id.toString())
          ),
        });

        let campaignId: string;
        if (!existing) {
          const [newCampaign] = await db
            .insert(adCampaigns)
            .values({
              brandId,
              platform: "tiktok",
              platformCampaignId: tc.campaign_id.toString(),
              name: tc.campaign_name,
              status: tc.status.toLowerCase(),
              objective: tc.objective.toLowerCase(),
              dailyBudget: (tc.budget / 1_000_000).toString(),
            })
            .returning();
          campaignId = newCampaign.id;
          campaigns++;
        } else {
          campaignId = existing.id;
        }

        // Get stats
        try {
          const statsArray = await client.getStats(
            Number(advertiserId),
            "CAMPAIGN",
            [tc.campaign_id],
            date,
            date
          );

          if (statsArray.length > 0) {
            const stats = statsArray[0];
            await db.insert(adDataSnapshots).values({
              brandId,
              platform: "tiktok",
              campaignId,
              date,
              spend: stats.spend?.toString() || "0",
              impressions: stats.impressions || 0,
              clicks: stats.clicks || 0,
              conversions: stats.conversions || 0,
            }).onConflictDoNothing();
            snapshots++;
          }
        } catch (err) {
          console.error(`Error fetching stats for campaign ${tc.campaign_id}:`, err);
        }
      } catch (err) {
        console.error(`Error syncing campaign ${tc.campaign_id}:`, err);
        errors++;
      }
    }

    // Sync ads
    const tiktokAds = await client.getAds(Number(advertiserId));
    for (const ta of tiktokAds) {
      const existingAd = await db.query.ads.findFirst({
        where: (table, { eq }) => eq(table.platformAdId, ta.ad_id.toString()),
      });

      if (!existingAd) {
        await db.insert(ads).values({
          platformAdId: ta.ad_id.toString(),
          name: ta.name,
          status: ta.status.toLowerCase(),
          creativeThumbnail: ta.creative?.image_url || null,
        });
        adCount++;
      }
    }
  } catch (err) {
    console.error("Error fetching TikTok campaigns:", err);
    throw err;
  }

  return { campaigns, adSets: 0, ads: adCount, snapshots, errors };
}

export async function logSync(
  brandId: string,
  platform: Platform,
  syncType: "ad_data" | "orders" | "products" | "token_refresh",
  status: "started" | "success" | "failed" | "partial",
  recordsProcessed: number,
  errorMessage?: string
) {
  const crypto = await import("crypto");
  const logId = crypto.randomUUID();

  await db.insert(syncLogs).values({
    id: logId,
    brandId,
    platform,
    syncType,
    status,
    recordsProcessed,
    errorMessage,
    startedAt: new Date(),
    completedAt: status !== "started" ? new Date() : null,
  });

  return logId;
}
