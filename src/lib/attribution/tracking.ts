/**
 * Attribution Tracking Utilities
 * Track touchpoints and attribute conversions across platforms
 */

import { db } from "@/lib/db";
import {
  pixelEvents,
  shopifyOrders,
  adCampaigns,
  adDataSnapshots,
} from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { sql as sqlTemplate } from "drizzle-orm";

export interface Touchpoint {
  id: string;
  type: "ad_click" | "pixel_event" | "email" | "direct";
  platform: string;
  campaignId?: string;
  timestamp: Date;
  attributes: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
}

export interface AttributionResult {
  orderId: string;
  attributedTouchpoints: Array<{
    touchpointId: string;
    platform: string;
    campaignId?: string;
    contribution: number; // 0-1 score
    model: string;
  }>;
  totalValue: number;
  attributionModel: "first_click" | "last_click" | "linear" | "time_decay" | "position_based";
}

/**
 * Track a pixel event for attribution
 */
export async function trackPixelEvent(data: {
  brandId: string;
  eventType: string;
  eventId: string;
  sessionId: string;
  userAgent?: string;
  ipHash?: string;
  referrer?: string;
  pageUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  eventData?: {
    value?: number;
    currency?: string;
    contentIds?: string[];
    contentType?: string;
    orderId?: string;
  };
}): Promise<void> {
  await db.insert(pixelEvents).values({
    brandId: data.brandId,
    eventType: data.eventType,
    eventId: data.eventId,
    sessionId: data.sessionId,
    userAgent: data.userAgent,
    ipHash: data.ipHash,
    referrer: data.referrer,
    pageUrl: data.pageUrl,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
    utmContent: data.utmContent,
    utmTerm: data.utmTerm,
    eventData: data.eventData as any,
  });
}

/**
 * Get touchpoints for a session
 */
export async function getSessionTouchpoints(
  brandId: string,
  sessionId: string,
  lookbackDays = 30
): Promise<Touchpoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  const events = await db.query.pixelEvents.findMany({
    where: and(
      eq(pixelEvents.brandId, brandId),
      eq(pixelEvents.sessionId, sessionId),
      gte(pixelEvents.createdAt, since)
    ),
    orderBy: [desc(pixelEvents.createdAt)],
  });

  return events.map((e) => ({
    id: e.id,
    type: "pixel_event" as const,
    platform: e.utmSource || "unknown",
    timestamp: e.createdAt,
    attributes: {
      utmSource: e.utmSource || undefined,
      utmMedium: e.utmMedium || undefined,
      utmCampaign: e.utmCampaign || undefined,
      utmContent: e.utmContent || undefined,
      utmTerm: e.utmTerm || undefined,
    },
  }));
}

/**
 * Attribute a conversion using first-click model
 */
export async function attributeFirstClick(
  orderId: string,
  touchpoints: Touchpoint[]
): Promise<AttributionResult> {
  if (touchpoints.length === 0) {
    return {
      orderId,
      attributedTouchpoints: [],
      totalValue: 0,
      attributionModel: "first_click",
    };
  }

  const firstTouchpoint = touchpoints[touchpoints.length - 1];

  return {
    orderId,
    attributedTouchpoints: [
      {
        touchpointId: firstTouchpoint.id,
        platform: firstTouchpoint.platform,
        campaignId: firstTouchpoint.campaignId,
        contribution: 1.0,
        model: "first_click",
      },
    ],
    totalValue: 0,
    attributionModel: "first_click",
  };
}

/**
 * Attribute a conversion using last-click model
 */
export async function attributeLastClick(
  orderId: string,
  touchpoints: Touchpoint[]
): Promise<AttributionResult> {
  if (touchpoints.length === 0) {
    return {
      orderId,
      attributedTouchpoints: [],
      totalValue: 0,
      attributionModel: "last_click",
    };
  }

  const lastTouchpoint = touchpoints[0];

  return {
    orderId,
    attributedTouchpoints: [
      {
        touchpointId: lastTouchpoint.id,
        platform: lastTouchpoint.platform,
        campaignId: lastTouchpoint.campaignId,
        contribution: 1.0,
        model: "last_click",
      },
    ],
    totalValue: 0,
    attributionModel: "last_click",
  };
}

/**
 * Attribute a conversion using linear model
 */
export async function attributeLinear(
  orderId: string,
  touchpoints: Touchpoint[]
): Promise<AttributionResult> {
  if (touchpoints.length === 0) {
    return {
      orderId,
      attributedTouchpoints: [],
      totalValue: 0,
      attributionModel: "linear",
    };
  }

  const contribution = 1 / touchpoints.length;

  return {
    orderId,
    attributedTouchpoints: touchpoints.map((tp) => ({
      touchpointId: tp.id,
      platform: tp.platform,
      campaignId: tp.campaignId,
      contribution,
      model: "linear",
    })),
    totalValue: 0,
    attributionModel: "linear",
  };
}

/**
 * Attribute a conversion using time-decay model
 */
export async function attributeTimeDecay(
  orderId: string,
  touchpoints: Touchpoint[],
  halfLifeDays = 7
): Promise<AttributionResult> {
  if (touchpoints.length === 0) {
    return {
      orderId,
      attributedTouchpoints: [],
      totalValue: 0,
      attributionModel: "time_decay",
    };
  }

  const now = Date.now();
  const decayRate = Math.log(2) / (halfLifeDays * 24 * 60 * 60 * 1000);

  // Calculate decay weights
  const weights = touchpoints.map((tp) => {
    const age = now - tp.timestamp.getTime();
    return Math.exp(-decayRate * age);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  return {
    orderId,
    attributedTouchpoints: touchpoints.map((tp, i) => ({
      touchpointId: tp.id,
      platform: tp.platform,
      campaignId: tp.campaignId,
      contribution: weights[i] / totalWeight,
      model: "time_decay",
    })),
    totalValue: 0,
    attributionModel: "time_decay",
  };
}

/**
 * Attribute a conversion using position-based (U-shaped) model
 * Gives 40% to first touch, 40% to last touch, 20% distributed between
 */
export async function attributePositionBased(
  orderId: string,
  touchpoints: Touchpoint[]
): Promise<AttributionResult> {
  if (touchpoints.length === 0) {
    return {
      orderId,
      attributedTouchpoints: [],
      totalValue: 0,
      attributionModel: "position_based",
    };
  }

  if (touchpoints.length === 1) {
    return {
      orderId,
      attributedTouchpoints: [
        {
          touchpointId: touchpoints[0].id,
          platform: touchpoints[0].platform,
          campaignId: touchpoints[0].campaignId,
          contribution: 1.0,
          model: "position_based",
        },
      ],
      totalValue: 0,
      attributionModel: "position_based",
    };
  }

  const middleContributions = touchpoints.length > 2
    ? 0.2 / (touchpoints.length - 2)
    : 0;

  return {
    orderId,
    attributedTouchpoints: touchpoints.map((tp, i) => {
      let contribution: number;
      if (i === touchpoints.length - 1) {
        // First touchpoint (events are in reverse chronological order)
        contribution = 0.4;
      } else if (i === 0) {
        // Last touchpoint
        contribution = 0.4;
      } else {
        // Middle touchpoints
        contribution = middleContributions;
      }

      return {
        touchpointId: tp.id,
        platform: tp.platform,
        campaignId: tp.campaignId,
        contribution,
        model: "position_based",
      };
    }),
    totalValue: 0,
    attributionModel: "position_based",
  };
}

/**
 * Get attribution data for a brand
 */
export async function getBrandAttribution(
  brandId: string,
  startDate: string,
  endDate: string,
  model: "first_click" | "last_click" | "linear" | "time_decay" | "position_based" = "last_click"
): Promise<{
  byPlatform: Array<{ platform: string; attributedRevenue: number; conversions: number }>;
  byCampaign: Array<{ campaignId: string; campaignName: string; attributedRevenue: number; conversions: number }>;
}> {
  // Get orders in date range
  const orders = await db.query.shopifyOrders.findMany({
    where: and(
      eq(shopifyOrders.brandId, brandId),
      eq(shopifyOrders.financialStatus, "paid"),
      sqlTemplate`${shopifyOrders.processedAt} >= ${startDate}` as any,
      sqlTemplate`${shopifyOrders.processedAt} <= ${endDate}` as any
    ),
  });

  // Group by platform/campaign based on pixel events
  // This is a simplified version - in production, you'd process each order
  // through the full attribution pipeline

  const byPlatform: Record<string, { attributedRevenue: number; conversions: number }> = {};
  const byCampaign: Record<string, { campaignName: string; attributedRevenue: number; conversions: number }> = {};

  // For demo, use pixel events to estimate attribution
  const pixelEventsData = await db
    .select({
      utmSource: pixelEvents.utmSource,
      utmCampaign: pixelEvents.utmCampaign,
      value: sql<number>`CAST(${pixelEvents.eventData}->>'value' AS FLOAT)`,
    })
    .from(pixelEvents)
    .where(
      and(
        eq(pixelEvents.brandId, brandId),
        sqlTemplate`${pixelEvents.createdAt} >= ${startDate}` as any,
        sqlTemplate`${pixelEvents.createdAt} <= ${endDate}` as any
      )
    );

  for (const event of pixelEventsData) {
    const platform = event.utmSource || "direct";
    const campaign = event.utmCampaign || "unknown";

    if (!byPlatform[platform]) {
      byPlatform[platform] = { attributedRevenue: 0, conversions: 0 };
    }
    byPlatform[platform].attributedRevenue += event.value || 0;
    byPlatform[platform].conversions += 1;

    if (!byCampaign[campaign]) {
      byCampaign[campaign] = { campaignName: campaign, attributedRevenue: 0, conversions: 0 };
    }
    byCampaign[campaign].attributedRevenue += event.value || 0;
    byCampaign[campaign].conversions += 1;
  }

  return {
    byPlatform: Object.entries(byPlatform).map(([platform, data]) => ({
      platform,
      ...data,
    })),
    byCampaign: Object.entries(byCampaign).map(([campaignId, data]) => ({
      campaignId,
      ...data,
    })),
  };
}

/**
 * Generate UTM parameters for tracking
 */
export function generateUTMParams(params: {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}): URLSearchParams {
  const searchParams = new URLSearchParams();
  searchParams.set("utm_source", params.source);
  searchParams.set("utm_medium", params.medium);
  searchParams.set("utm_campaign", params.campaign);
  if (params.content) searchParams.set("utm_content", params.content);
  if (params.term) searchParams.set("utm_term", params.term);
  return searchParams;
}

/**
 * Parse UTM parameters from URL
 */
export function parseUTMParams(urlString: string): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
} {
  try {
    const url = new URL(urlString);
    return {
      utmSource: url.searchParams.get("utm_source") || undefined,
      utmMedium: url.searchParams.get("utm_medium") || undefined,
      utmCampaign: url.searchParams.get("utm_campaign") || undefined,
      utmContent: url.searchParams.get("utm_content") || undefined,
      utmTerm: url.searchParams.get("utm_term") || undefined,
    };
  } catch {
    return {};
  }
}
