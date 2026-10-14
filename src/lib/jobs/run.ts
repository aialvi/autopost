import { db } from "@/lib/db";
import { brands, notificationPreferences, platformConnections } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { calculateProfitMetrics } from "@/lib/profit/calculations";
import { sendDailySummary, sendWeeklySummary, checkAndTriggerAlerts } from "@/lib/telegram/notifications";
import { dateInTimezone } from "@/lib/telegram/time";
import { syncAdData, logSync, type AdPlatformConfig } from "@/lib/platforms/ads/sync";
import { syncShopifyProducts, syncShopifyOrders } from "@/lib/platforms/shopify/sync";
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
        const end = new Date(`${dateInTimezone(new Date(), brand.timezone)}T00:00:00Z`); end.setUTCDate(end.getUTCDate() - 1);
        const start = new Date(end); if (kind === "weekly-summary") start.setUTCDate(start.getUTCDate() - 6);
        const metrics = await calculateProfitMetrics(brandId, { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
        const context = { brandId, date: end.toISOString().slice(0, 10), revenue: metrics.revenue, orders: metrics.orders, adSpend: metrics.adSpend, roas: metrics.roas, topCampaigns: [] };
        if (kind === "daily-summary") await sendDailySummary(context);
        else await sendWeeklySummary({ ...context, weekNumber: Math.ceil((end.getTime() - Date.UTC(end.getUTCFullYear(), 0, 1)) / 604800000) + 1 });
      }
      processed++;
    } catch (error) { failed++; console.error("Notification job failed", kind, brandId, error instanceof Error ? error.message : "Unknown error"); }
  }
  return { processed, failed };
}

export async function runSyncJob(platform?: string) {
  const valid = ["shopify", "meta", "google", "snapchat", "tiktok"];
  if (platform && !valid.includes(platform)) throw new Error("Invalid platform");
  const connections = await db.query.platformConnections.findMany({ where: platform ? and(eq(platformConnections.status, "active"), eq(platformConnections.platform, platform as typeof platformConnections.$inferSelect.platform)) : eq(platformConnections.status, "active"), orderBy: [asc(platformConnections.lastSyncedAt)], limit: 10 });
  let processed = 0;
  let failed = 0;
  for (const connection of connections) {
    if (isDemoBrand(connection.brandId)) continue;
    try {
      if (connection.platform === "shopify") {
        const token = revealSecret(connection.accessToken);
        const products = await syncShopifyProducts(connection.brandId, connection.accountId, token);
        const orders = await syncShopifyOrders(connection.brandId, connection.accountId, token);
        if (products.errors || orders.errors) throw new Error("Shopify sync completed with errors");
        await db.update(platformConnections).set({ lastSyncedAt: new Date() }).where(eq(platformConnections.id, connection.id));
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
      await logSync(connection.brandId, connection.platform, "ad_data", "success", 1);
      processed++;
    } catch (error) { failed++; await logSync(connection.brandId, connection.platform, "ad_data", "failed", 0, error instanceof Error ? error.message : "Unknown error"); }
  }
  return { processed, failed };
}
