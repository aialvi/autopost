/**
 * Telegram Notification Utilities
 * Functions for sending various types of notifications via Telegram
 */

import { db } from "@/lib/db";
import {
  notificationPreferences,
  notificationLogs,
  brands,
} from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  sendMessage,
  escapeHtml,
  createKeyboard,
  type TelegramMessage,
} from "./client";

export interface NotificationContext {
  brandId: string;
  userId?: string;
  brandName?: string;
}

export interface LowRoasAlertContext {
  brandId: string;
  campaignName: string;
  platform: string;
  currentRoas: number;
  threshold: number;
  adSpend: number;
}

export interface SpendSpikeAlertContext {
  brandId: string;
  platform: string;
  currentSpend: number;
  expectedSpend: number;
  deviation: number;
}

export interface RevenueDropAlertContext {
  brandId: string;
  currentRevenue: number;
  previousRevenue: number;
  dropPercentage: number;
}

export interface NewOrderAlertContext {
  brandId: string;
  orderNumber: string;
  total: number;
  customerEmail?: string;
}

export interface DailySummaryContext {
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
  messageBuilder: (prefs: any) => string,
  keyboardBuilder?: () => ReturnType<typeof createKeyboard>
): Promise<void> {
  const { brandId } = context;

  // Get all notification preferences for this brand
  const preferences = await db.query.notificationPreferences.findMany({
    where: eq(notificationPreferences.brandId, brandId),
  });

  for (const pref of preferences) {
    if (!pref.enabled || !pref.telegramChatId) {
      continue;
    }

    // Check quiet hours
    if (isQuietHours(pref)) {
      continue;
    }

    const message = messageBuilder(pref);
    const keyboard = keyboardBuilder ? keyboardBuilder() : undefined;

    const result = await sendMessage({
      chatId: pref.telegramChatId,
      text: message,
      replyMarkup: keyboard,
    });

    // Log the notification
    await db.insert(notificationLogs).values({
      brandId,
      userId: pref.userId,
      type,
      channel: "telegram",
      status: result.ok ? "sent" : "failed",
      title: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      message,
      sentAt: new Date(),
      error: result.ok ? undefined : result.description,
    });
  }
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(pref: any): boolean {
  if (!pref.quietHoursStart || !pref.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = now
    .toLocaleTimeString("en-US", {
      timeZone: pref.timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
    .slice(0, 5);

  const [start] = pref.quietHoursStart.split(":").map(Number);
  const [end] = pref.quietHoursEnd.split(":").map(":");
  const [currentHour, currentMinute] = currentTime.split(":").map(Number);
  const currentMinutes = currentHour * 60 + currentMinute;

  const startMinutes = start * 60;
  const endMinutes = end * 60;

  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 22:00 - 06:00 crosses midnight, this wouldn't happen)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Crosses midnight (e.g., 22:00 - 06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Send low ROAS alert
 */
export async function sendLowRoasAlert(context: LowRoasAlertContext): Promise<void> {
  const { brandId, campaignName, platform, currentRoas, threshold, adSpend } = context;

  await sendNotification(
    { brandId },
    "low_roas",
    () => {
      const emoji = currentRoas < 0.5 ? "🚨" : currentRoas < 1 ? "⚠️" : "📉";
      return `${emoji} <b>Low ROAS Alert</b>

Campaign: <code>${escapeHtml(campaignName)}</code>
Platform: ${escapeHtml(platform.toUpperCase())}

Current ROAS: <b>${currentRoas.toFixed(2)}x</b>
Threshold: ${threshold}x
Ad Spend: $${adSpend.toFixed(2)}

Recommendation: Consider pausing or optimizing this campaign.`;
    },
    () =>
      createKeyboard([
        { text: "View Campaign", url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/campaigns?brandId=${brandId}` },
      ])
  );
}

/**
 * Send spend spike alert
 */
export async function sendSpendSpikeAlert(context: SpendSpikeAlertContext): Promise<void> {
  const { brandId, platform, currentSpend, expectedSpend, deviation } = context;

  await sendNotification(
    { brandId },
    "spend_spike",
    () => {
      const emoji = deviation > 100 ? "🚨" : deviation > 50 ? "⚠️" : "📈";
      return `${emoji} <b>Spend Spike Alert</b>

Platform: ${escapeHtml(platform.toUpperCase())}

Today's Spend: <b>$${currentSpend.toFixed(2)}</b>
Expected: $${expectedSpend.toFixed(2)}
Deviation: +${deviation.toFixed(0)}%

This is unusual spending activity. Please review your campaigns.`;
    },
    () =>
      createKeyboard([
        { text: "View Dashboard", url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?brandId=${brandId}` },
      ])
  );
}

/**
 * Send revenue drop alert
 */
export async function sendRevenueDropAlert(context: RevenueDropAlertContext): Promise<void> {
  const { brandId, currentRevenue, previousRevenue, dropPercentage } = context;

  await sendNotification(
    { brandId },
    "revenue_drop",
    () => {
      const emoji = dropPercentage > 40 ? "🚨" : dropPercentage > 20 ? "⚠️" : "📉";
      return `${emoji} <b>Revenue Drop Alert</b>

Today's Revenue: <b>$${currentRevenue.toFixed(2)}</b>
Previous: $${previousRevenue.toFixed(2)}
Drop: ${dropPercentage.toFixed(1)}%

This is a significant drop. Check for:
• Technical issues
• Ad campaign problems
• Stock availability`;
    },
    () =>
      createKeyboard([
        { text: "View Profit Analytics", url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profit?brandId=${brandId}` },
      ])
  );
}

/**
 * Send new order alert
 */
export async function sendNewOrderAlert(context: NewOrderAlertContext): Promise<void> {
  const { brandId, orderNumber, total, customerEmail } = context;

  await sendNotification(
    { brandId },
    "new_order",
    () => {
      return `🛒 <b>New Order</b>

Order: <code>${escapeHtml(orderNumber)}</code>
Total: <b>$${total.toFixed(2)}</b>
${customerEmail ? `Customer: ${escapeHtml(customerEmail)}` : ""}

Time: ${new Date().toLocaleTimeString()}`;
    }
  );
}

/**
 * Send daily summary
 */
export async function sendDailySummary(context: DailySummaryContext): Promise<void> {
  const { brandId, date, revenue, orders, adSpend, roas, topCampaigns } = context;

  await sendNotification(
    { brandId },
    "daily_summary",
    () => {
      let message = `📊 <b>Daily Summary - ${date}</b>\n\n`;
      message += `💰 Revenue: <b>$${revenue.toFixed(2)}</b>\n`;
      message += `📦 Orders: ${orders}\n`;
      message += `📣 Ad Spend: $${adSpend.toFixed(2)}\n`;
      message += `📈 ROAS: ${roas.toFixed(2)}x\n\n`;

      if (topCampaigns.length > 0) {
        message += `<b>Top Campaigns:</b>\n`;
        topCampaigns.forEach((campaign, i) => {
          message += `${i + 1}. ${escapeHtml(campaign.name)} - $${campaign.spend.toFixed(2)} (${campaign.roas.toFixed(2)}x)\n`;
        });
      }

      return message;
    },
    () =>
      createKeyboard([
        { text: "View Dashboard", url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?brandId=${brandId}` },
        { text: "Full Report", url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profit?brandId=${brandId}` },
      ])
  );
}

/**
 * Send weekly summary
 */
export async function sendWeeklySummary(
  context: DailySummaryContext & { weekNumber: number }
): Promise<void> {
  const { brandId, revenue, orders, adSpend, roas, weekNumber } = context;

  await sendNotification(
    { brandId },
    "weekly_summary",
    () => {
      return `📊 <b>Weekly Summary - Week ${weekNumber}</b>

💰 Total Revenue: <b>$${revenue.toFixed(2)}</b>
📦 Total Orders: ${orders}
📣 Ad Spend: $${adSpend.toFixed(2)}
📈 Average ROAS: ${roas.toFixed(2)}x

Great week! Keep up the momentum 🚀`;
    },
    () =>
      createKeyboard([
        { text: "View Dashboard", url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?brandId=${brandId}` },
        { text: "AI Insights", url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ai?brandId=${brandId}` },
      ])
  );
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
  const prefs = await getNotificationPreferences(brandId);

  if (!prefs || !prefs.enabled) {
    return;
  }

  // This would be called by a scheduled job
  // Implementation would check actual metrics and trigger appropriate alerts

  // Example:
  // const todayMetrics = await calculateProfitMetrics(brandId, { startDate: today, endDate: today });
  // if (prefs.alertOnLowRoas && todayMetrics.roas < parseFloat(prefs.lowRoasThreshold)) {
  //   // Trigger low ROAS alert
  // }
}
