import { formatSummary, type SummaryData } from "./summary";
import { getCampaignReport } from "@/lib/platforms/ads/report";
import { appUrl } from "@/lib/utils/app-url";
import { snapshotId } from "@/lib/platforms/ads/snapshot";
import { isQuietHours, dateInTimezone } from "./time";
import { calculateProfitMetrics } from "@/lib/profit/calculations";
/**
 * Telegram Notification Utilities
 * Functions for sending various types of notifications via Telegram
 */

import { db } from "@/lib/db";
import {
  notificationPreferences,
  notificationLogs,
  brands,
  brandUsers,
} from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import {
  sendMessage,
  escapeHtml,
  createKeyboard,
} from "./client";

export interface NotificationContext {
  brandId: string;
  userId?: string;
  brandName?: string;
  eventKey?: string;
}

export interface LowRoasAlertContext {
  currency?: string;
  userId?: string;
  brandId: string;
  campaignName: string;
  platform: string;
  currentRoas: number;
  threshold: number;
  adSpend: number;
}

export interface SpendSpikeAlertContext {
  currency?: string;
  userId?: string;
  brandId: string;
  platform: string;
  currentSpend: number;
  expectedSpend: number;
  deviation: number;
}

export interface RevenueDropAlertContext {
  currency?: string;
  userId?: string;
  brandId: string;
  currentRevenue: number;
  previousRevenue: number;
  dropPercentage: number;
}

export interface NewOrderAlertContext {
  currency?: string;
  userId?: string;
  brandId: string;
  orderNumber: string;
  total: number;
  customerEmail?: string;
}

export interface DailySummaryContext extends SummaryData {
  userId?: string;
  brandId: string;
  date: string;
  revenue: number;
  orders: number;
  adSpend: number;
  roas: number;
  topCampaigns: Array<{ name: string; spend: number; roas: number }>;
}

/**
 * Get notification preferences for a brand/user
 */
export async function getNotificationPreferences(
  brandId: string,
  userId?: string
) {
  const query = eq(notificationPreferences.brandId, brandId);

  const prefs = await db.query.notificationPreferences.findFirst({
    where: userId ? and(query, eq(notificationPreferences.userId, userId)) : query,
  });

  return prefs;
}

/**
 * Send notification to eligible recipients
 */
async function sendNotification(
  context: NotificationContext,
  type: string,
  messageBuilder: (prefs: typeof notificationPreferences.$inferSelect) => string,
  keyboardBuilder?: () => ReturnType<typeof createKeyboard>
): Promise<void> {
  const { brandId } = context;

  // Get all notification preferences for this brand
  const preferences = await db.query.notificationPreferences.findMany({
    where: context.userId ? and(eq(notificationPreferences.brandId, brandId), eq(notificationPreferences.userId, context.userId)) : eq(notificationPreferences.brandId, brandId),
  });
  const memberships = await db.query.brandUsers.findMany({ where: eq(brandUsers.brandId, brandId) });
  const allowedUsers = new Set(memberships.map((member) => member.userId));
  const flags: Record<string, keyof typeof notificationPreferences.$inferSelect> = {
    budget_exceeded: "alertOnSpendSpike", low_roas: "alertOnLowRoas", spend_spike: "alertOnSpendSpike", revenue_drop: "alertOnRevenueDrop", new_order: "alertOnNewOrder", daily_summary: "alertOnDailySummary", weekly_summary: "alertOnWeeklySummary",
  };

  for (const pref of preferences) {
    if (!pref.enabled || !pref.telegramChatId || !allowedUsers.has(pref.userId) || !pref[flags[type]]) {
      continue;
    }

    // Check quiet hours
    if (isQuietHours(pref)) {
      continue;
    }

    // Summaries send once a day; alert jobs suppress repeats for two hours.
    const now = new Date();
    const since = new Date(now.getTime() - (type.endsWith("summary") ? 20 * 3600000 : 2 * 3600000));
    const alreadySent = !context.eventKey && await db.query.notificationLogs.findFirst({ where: and(eq(notificationLogs.brandId, brandId), eq(notificationLogs.userId, pref.userId), eq(notificationLogs.type, type), eq(notificationLogs.status, "sent"), gte(notificationLogs.sentAt, since)) });
    if (alreadySent) continue;
    const message = messageBuilder(pref);
    const keyboard = keyboardBuilder ? keyboardBuilder() : undefined;

    const slot = type.endsWith("summary") ? dateInTimezone(now, pref.timezone) : String(Math.floor(now.getTime() / (2 * 3600000)));
    const id = snapshotId(brandId, type, pref.userId, context.eventKey ?? slot);
    const [reserved] = await db.insert(notificationLogs).values({ id, brandId, userId: pref.userId, type, channel: "telegram", status: "pending", title: type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), message, sentAt: now }).onConflictDoUpdate({ target: notificationLogs.id, set: { status: "pending", error: null }, setWhere: eq(notificationLogs.status, "failed") }).returning({ id: notificationLogs.id });
    if (!reserved) continue;
    const result = await sendMessage({
      chatId: pref.telegramChatId,
      text: message,
      replyMarkup: keyboard,
    });

    await db.update(notificationLogs).set({ status: result.ok ? "sent" : "failed", sentAt: new Date(), error: result.ok ? null : result.description }).where(eq(notificationLogs.id, id));
    if (!result.ok) throw new Error(`Telegram delivery failed: ${result.description ?? "Unknown error"}`);

  }
}

/**
 * Send low ROAS alert
 */
export async function sendLowRoasAlert(context: LowRoasAlertContext): Promise<void> {
  const { brandId, campaignName, platform, currentRoas, threshold, adSpend } = context;

  await sendNotification(
    { brandId, userId: context.userId },
    "low_roas",
    () => {
      const emoji = currentRoas < 0.5 ? "🚨" : currentRoas < 1 ? "⚠️" : "📉";
      return `${emoji} <b>Low ROAS Alert</b>

Campaign: <code>${escapeHtml(campaignName)}</code>
Platform: ${escapeHtml(platform.toUpperCase())}

Current ROAS: <b>${currentRoas.toFixed(2)}x</b>
Threshold: ${threshold}x
Ad Spend: ${context.currency ?? "USD"} ${adSpend.toFixed(2)}

Recommendation: Consider pausing or optimizing this campaign.`;
    },
    () =>
      createKeyboard([
        { text: "View Campaign", url: `${appUrl()}/dashboard?brandId=${brandId}` },
      ])
  );
}

/**
 * Send spend spike alert
 */
export async function sendSpendSpikeAlert(context: SpendSpikeAlertContext): Promise<void> {
  const { brandId, platform, currentSpend, expectedSpend, deviation } = context;

  await sendNotification(
    { brandId, userId: context.userId },
    "spend_spike",
    () => {
      const emoji = deviation > 100 ? "🚨" : deviation > 50 ? "⚠️" : "📈";
      return `${emoji} <b>Spend Spike Alert</b>

Platform: ${escapeHtml(platform.toUpperCase())}

Today's Spend: <b>${context.currency ?? "USD"} ${currentSpend.toFixed(2)}</b>
Expected: ${context.currency ?? "USD"} ${expectedSpend.toFixed(2)}
Deviation: +${deviation.toFixed(0)}%

This is unusual spending activity. Please review your campaigns.`;
    },
    () =>
      createKeyboard([
        { text: "View Dashboard", url: `${appUrl()}/dashboard?brandId=${brandId}` },
      ])
  );
}

/**
 * Send revenue drop alert
 */
export async function sendRevenueDropAlert(context: RevenueDropAlertContext): Promise<void> {
  const { brandId, currentRevenue, previousRevenue, dropPercentage } = context;

  await sendNotification(
    { brandId, userId: context.userId },
    "revenue_drop",
    () => {
      const emoji = dropPercentage > 40 ? "🚨" : dropPercentage > 20 ? "⚠️" : "📉";
      return `${emoji} <b>Revenue Drop Alert</b>

Yesterday's Revenue: <b>${context.currency ?? "USD"} ${currentRevenue.toFixed(2)}</b>
Previous: ${context.currency ?? "USD"} ${previousRevenue.toFixed(2)}
Drop: ${dropPercentage.toFixed(1)}%

This is a significant drop. Check for:
• Technical issues
• Ad campaign problems
• Stock availability`;
    },
    () =>
      createKeyboard([
        { text: "View Profit Analytics", url: `${appUrl()}/dashboard/profit?brandId=${brandId}` },
      ])
  );
}

/**
 * Send new order alert
 */
export async function sendNewOrderAlert(context: NewOrderAlertContext): Promise<void> {
  const { brandId, orderNumber, total, customerEmail } = context;

  await sendNotification(
    { brandId, userId: context.userId, eventKey: orderNumber },
    "new_order",
    () => {
      return `🛒 <b>New Order</b>

Order: <code>${escapeHtml(orderNumber)}</code>
Total: <b>${context.currency ?? "USD"} ${total.toFixed(2)}</b>
${customerEmail ? `Customer: ${escapeHtml(customerEmail)}` : ""}

Time: ${new Date().toLocaleTimeString()}`;
    }
  );
}

/**
 * Send daily summary
 */
export async function sendDailySummary(context: DailySummaryContext): Promise<void> {
  await sendNotification({ ...context, eventKey: context.date }, "daily_summary", () => formatSummary(context), () => createKeyboard([
    { text: "Full Report", url: `${appUrl()}/dashboard/profit?brandId=${context.brandId}&startDate=${context.date}&endDate=${context.date}` },
  ]));
}

export async function sendWeeklySummary(context: DailySummaryContext & { weekNumber?: number }): Promise<void> {
  await sendNotification({ ...context, eventKey: context.date }, "weekly_summary", () => formatSummary(context, true), () => createKeyboard([
    { text: "Full Report", url: `${appUrl()}/dashboard/profit?brandId=${context.brandId}&startDate=${context.startDate ?? context.date}&endDate=${context.date}` },
  ]));
}

/**
 * Send test notification
 */
export async function sendTestNotification(brandId: string, chatId: string): Promise<boolean> {
  const brand = await db.query.brands.findFirst({
    where: eq(brands.id, brandId),
  });

  const result = await sendMessage({
    chatId,
    text: `✅ <b>Test Notification</b>

This is a test message from AutoPost for brand: <b>${escapeHtml(brand?.name || "Unknown")}</b>

If you received this, your Telegram notifications are configured correctly! 🎉`,
  });

  return result.ok;
}

/**
 * Check and trigger alerts based on conditions
 */
export async function checkAndTriggerAlerts(brandId: string): Promise<void> {
  const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
  if (!brand) return;
  const preferences = await db.query.notificationPreferences.findMany({ where: eq(notificationPreferences.brandId, brandId) });
  const today = dateInTimezone(new Date(), brand.timezone);
  const previous = new Date(`${today}T00:00:00Z`); previous.setUTCDate(previous.getUTCDate() - 1);
  const yesterday = previous.toISOString().slice(0, 10);
  const start = new Date(previous); start.setUTCDate(start.getUTCDate() - 6);
  const [current, lastDay, baseline] = await Promise.all([
    calculateProfitMetrics(brandId, { startDate: today, endDate: today }),
    calculateProfitMetrics(brandId, { startDate: yesterday, endDate: yesterday }),
    calculateProfitMetrics(brandId, { startDate: start.toISOString().slice(0, 10), endDate: yesterday }),
  ]);
  const budgetCampaigns = [];
  let page = 1;
  while (true) {
    const report = await getCampaignReport(brandId, { startDate: today, endDate: today, platform: "all", page });
    budgetCampaigns.push(...report.campaigns.filter(c => Number(c.dailyBudget) > 0 && c.spend > Number(c.dailyBudget)));
    if (page * report.pageSize >= report.total) break;
    page++;
  }
  for (const pref of preferences) {
    if (!pref.enabled || !pref.telegramChatId) continue;
    for (const campaign of budgetCampaigns) {
      const over = (campaign.spend / Number(campaign.dailyBudget) - 1) * 100;
      if (!pref.alertOnSpendSpike || over < Number(pref.spendSpikeThreshold)) continue;
      await sendNotification({ brandId, userId: pref.userId, eventKey: `${today}:${campaign.id}` }, "budget_exceeded", () =>
        `⚡ <b>Campaign budget alert · ${escapeHtml(brand.name)}</b>\n${escapeHtml(campaign.name)} (${campaign.platform})\nSpend: ${brand.currency} ${campaign.spend.toFixed(2)}\nCurrent daily budget: ${brand.currency} ${Number(campaign.dailyBudget).toFixed(2)}\n${over.toFixed(0)}% above budget. Review in your ad platform.`, () => createKeyboard([{ text: "View campaigns", url: `${appUrl()}/dashboard/campaigns?brandId=${brandId}` }]));
    }
    if (pref.alertOnLowRoas && current.adSpend > 0 && current.roas < Number(pref.lowRoasThreshold)) await sendLowRoasAlert({ brandId, currency: brand.currency, userId: pref.userId, campaignName: `${brand.name} · All campaigns`, platform: "all platforms", currentRoas: current.roas, threshold: Number(pref.lowRoasThreshold), adSpend: current.adSpend });
    const averageSpend = baseline.adSpend / 7;
    const deviation = averageSpend > 0 ? (current.adSpend - averageSpend) / averageSpend * 100 : 0;
    if (pref.alertOnSpendSpike && averageSpend > 0 && deviation > 0 && deviation >= Number(pref.spendSpikeThreshold)) await sendSpendSpikeAlert({ brandId, currency: brand.currency, userId: pref.userId, platform: "all platforms", currentSpend: current.adSpend, expectedSpend: averageSpend, deviation });
    // Compare complete days to avoid a partial morning appearing as a revenue drop.
    const earlier = new Date(previous); earlier.setUTCDate(earlier.getUTCDate() - 1);
    const prior = await calculateProfitMetrics(brandId, { startDate: earlier.toISOString().slice(0, 10), endDate: earlier.toISOString().slice(0, 10) });
    const drop = prior.revenue > 0 ? (prior.revenue - lastDay.revenue) / prior.revenue * 100 : 0;
    if (pref.alertOnRevenueDrop && drop > 0 && drop >= Number(pref.revenueDropThreshold)) await sendRevenueDropAlert({ brandId, currency: brand.currency, userId: pref.userId, currentRevenue: lastDay.revenue, previousRevenue: prior.revenue, dropPercentage: drop });
  }
}
