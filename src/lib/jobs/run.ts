import { db } from "@/lib/db";
import { brands, notificationPreferences, platformConnections } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { calculateProfitMetrics } from "@/lib/profit/calculations";
import { sendDailySummary, sendWeeklySummary, checkAndTriggerAlerts } from "@/lib/telegram/notifications";
import { getCampaignReport } from "@/lib/platforms/ads/report";
import { summaryIsDue, dateInTimezone } from "@/lib/telegram/time";
import { syncAdData, logSync, type AdPlatformConfig } from "@/lib/platforms/ads/sync";
import { syncShopifyStore } from "@/lib/platforms/shopify/sync";
import { revealSecret } from "@/lib/platforms/connection-secrets";
import { isDemoBrand } from "@/lib/demo/config";

export async function runNotificationJob(kind: "daily-summary" | "weekly-summary" | "check-anomalies") {
  const preferences = await db.query.notificationPreferences.findMany({ where: eq(notificationPreferences.enabled, true) });
  const ids = [...new Set(preferences.filter((pref) => pref.telegramChatId).map((pref) => pref.brandId))].filter((id) => !isDemoBrand(id));
  let processed = 0;
  let failed = 0;
  for (const brandId of ids) {
    try {
      if (kind === "check-anomalies") await checkAndTriggerAlerts(brandId);
      else {
        const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
        if (!brand) continue;
        const now = new Date();
        for (const pref of preferences.filter(pref => pref.brandId === brandId && pref.telegramChatId && (kind === "daily-summary" ? pref.alertOnDailySummary : pref.alertOnWeeklySummary))) {
          if (!summaryIsDue(kind, pref, now)) continue;
          try {
            const end = new Date(`${dateInTimezone(now, brand.timezone)}T00:00:00Z`);
            end.setUTCDate(end.getUTCDate() - 1);
            if (kind === "weekly-summary") end.setUTCDate(end.getUTCDate() - end.getUTCDay());
            const start = new Date(end);
            if (kind === "weekly-summary") start.setUTCDate(start.getUTCDate() - 6);
            const range = { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
            const metrics = await calculateProfitMetrics(brandId, range);
            const report = await getCampaignReport(brandId, { ...range, platform: "all", page: 1 });
            const context = { brandId, userId: pref.userId, brandName: brand.name, currency: brand.currency, startDate: range.startDate, date: range.endDate, revenue: metrics.revenue, netProfit: metrics.netProfit, orders: metrics.orders, adSpend: metrics.adSpend, roas: metrics.roas, topCampaigns: report.campaigns.filter(c => c.spend > 0).slice(0, 3) };
            if (kind === "daily-summary") await sendDailySummary(context);
            else await sendWeeklySummary(context);
          } catch (error) { failed++; console.error("Summary recipient failed", brandId, pref.userId, error instanceof Error ? error.message : "Unknown error"); }
        }
      }
      processed++;
    } catch (error) { failed++; console.error("Notification job failed", kind, brandId, error instanceof Error ? error.message : "Unknown error"); }
  }
  return { processed, failed };
}

export async function runSyncJob(platform?: string) {
  const valid = ["shopify", "meta", "google", "snapchat", "tiktok"];
  if (platform && !valid.includes(platform)) throw new Error("Invalid platform");
  const connections = await db.query.platformConnections.findMany({ where: platform ? and(eq(platformConnections.status, "active"), eq(platformConnections.platform, platform as typeof platformConnections.$inferSelect.platform)) : eq(platformConnections.status, "active"), orderBy: [asc(platformConnections.updatedAt)], limit: 10 });
  let processed = 0;
  let failed = 0;
  for (const connection of connections) {
    if (isDemoBrand(connection.brandId)) continue;
    try {
      if (connection.platform === "shopify") {
        const token = revealSecret(connection.accessToken);
        const result = await syncShopifyStore(connection.brandId, connection.accountId, token);
        if (result.errors) throw new Error("Shopify sync completed with errors");
      } else {
        const config: AdPlatformConfig = { ...connection.metadata, platform: connection.platform as AdPlatformConfig["platform"], accountId: connection.accountId, accessToken: connection.accessToken, refreshToken: connection.refreshToken ?? undefined };
        const brand = await db.query.brands.findFirst({ where: eq(brands.id, connection.brandId) });
        const today = dateInTimezone(new Date(), brand?.timezone ?? "UTC");
        // Refresh yesterday and today so late attribution updates are captured.
        const yesterday = new Date(`${today}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        for (const date of [yesterday.toISOString().slice(0, 10), today]) {
          const result = await syncAdData(connection.brandId, config, date);
          if (result.errors) throw new Error("Ad sync completed with errors");
        }
      }
      if (connection.platform !== "shopify") await logSync(connection.brandId, connection.platform, "ad_data", "success", 1);
      processed++;
    } catch (error) { failed++; if (connection.platform !== "shopify") await logSync(connection.brandId, connection.platform, "ad_data", "failed", 0, error instanceof Error ? error.message : "Unknown error"); }
    finally { await db.update(platformConnections).set({ updatedAt: new Date() }).where(eq(platformConnections.id, connection.id)); }
  }
  return { processed, failed };
}
