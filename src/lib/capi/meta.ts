/**
 * Meta (Facebook) Conversion API (CAPI) Client
 * Sends server-side events to Meta for accurate attribution
 */

import { db } from "@/lib/db";
import { capiEvents, platformConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface MetaCAPIConfig {
  accessToken: string;
  pixelId: string;
  testCode?: string;
}

export interface MetaEvent {
  eventName: string;
  eventTime: number;
  eventSourceUrl: string;
  eventData: {
    eventName: string;
    eventTime: number;
    eventSourceUrl: string;
    userData: MetaUserData;
    customData?: MetaCustomData;
    actionSource?: string;
    eventID?: string;
  };
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  externalId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string; // Facebook click ID
  fbp?: string; // Facebook browser ID
  subscriptionId?: string;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contentType?: string;
  contents?: Array<{ id: string; quantity: number; item_price: number }>;
  orderId?: string;
  numItems?: number;
  paymentMethod?: string;
  status?: string;
  searchTerm?: string;
}

export interface CAPIEventResult {
  success: boolean;
  eventId: string;
  responseStatus?: string;
  responseBody?: string;
  error?: string;
}

/**
 * Get Meta CAPI config for a brand
 */
export async function getMetaConfig(brandId: string): Promise<MetaCAPIConfig | null> {
  const connection = await db.query.platformConnections.findFirst({
    where: eq(platformConnections.brandId, brandId),
  });

  if (!connection || connection.platform !== "meta" || connection.status !== "active") {
    return null;
  }

  // Meta CAPI uses the access token and pixel ID from metadata
  const pixelId = connection.metadata?.pixelId;
  const testCode = connection.metadata?.testCode;

  if (!pixelId) {
    return null;
  }

  return {
    accessToken: connection.accessToken,
    pixelId,
    testCode,
  };
}

/**
 * Normalize user data for Meta CAPI (hashing)
 */
export function normalizeUserData(userData: Partial<MetaUserData>): MetaUserData {
  const normalized: MetaUserData = {};

  // Hash email, phone, and other PII as required by Meta
  if (userData.email) {
    normalized.email = hashData(userData.email.toLowerCase().trim());
  }
  if (userData.phone) {
    normalized.phone = hashData(normalizePhone(userData.phone));
  }
  if (userData.firstName) {
    normalized.firstName = hashData(userData.firstName.toLowerCase().trim());
  }
  if (userData.lastName) {
    normalized.lastName = hashData(userData.lastName.toLowerCase().trim());
  }
  if (userData.city) {
    normalized.city = hashData(userData.city.toLowerCase().trim());
  }
  if (userData.state) {
    normalized.state = hashData(userData.state.toLowerCase().trim());
  }
  if (userData.zip) {
    normalized.zip = hashData(userData.zip.toLowerCase().trim());
  }
  if (userData.externalId) {
    normalized.externalId = hashData(userData.externalId);
  }

  // Pass through non-PII data
  if (userData.clientIpAddress) normalized.clientIpAddress = userData.clientIpAddress;
  if (userData.clientUserAgent) normalized.clientUserAgent = userData.clientUserAgent;
  if (userData.fbc) normalized.fbc = userData.fbc;
  if (userData.fbp) normalized.fbp = userData.fbp;
  if (userData.subscriptionId) normalized.subscriptionId = userData.subscriptionId;

  return normalized;
}

/**
 * Hash data using SHA-256 for Meta CAPI
 */
function hashData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Normalize phone number for Meta CAPI
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Send event to Meta CAPI
 */
export async function sendMetaEvent(
  brandId: string,
  eventName: string,
  userData: Partial<MetaUserData>,
  customData?: MetaCustomData,
  options?: {
    eventSourceUrl?: string;
    actionSource?: string;
    eventId?: string;
    testCode?: string;
  }
): Promise<CAPIEventResult> {
  const config = await getMetaConfig(brandId);
  if (!config) {
    return {
      success: false,
      eventId: crypto.randomUUID(),
      error: "Meta CAPI not configured for this brand",
    };
  }

  const eventId = options?.eventId || crypto.randomUUID();
  const eventTime = Math.floor(Date.now() / 1000);
  const eventSourceUrl = options?.eventSourceUrl || `${process.env.NEXT_PUBLIC_APP_URL || "https://autopost.app"}`;

  const normalizedUserData = normalizeUserData(userData);

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_source_url: eventSourceUrl,
        user_data: normalizedUserData,
        custom_data: customData,
        action_source: options?.actionSource || "website",
        event_id: eventId,
      },
    ],
    test_event_code: options?.testCode || config.testCode,
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.pixelId}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: config.accessToken,
          ...payload,
        }),
      }
    );

    const responseText = await response.text();
    const responseStatus = response.status.toString();

    // Log the CAPI event
    await db.insert(capiEvents).values({
      brandId,
      platform: "meta",
      eventName,
      eventId,
      eventData: payload as any,
      sentAt: new Date(),
      responseStatus,
      responseBody: responseText.substring(0, 1000), // Limit size
    });

    if (response.ok) {
      const json = JSON.parse(responseText);
      // Check for fbtrace_id which indicates success
      return {
        success: true,
        eventId,
        responseStatus,
        responseBody: responseText,
      };
    } else {
      return {
        success: false,
        eventId,
        responseStatus,
        responseBody: responseText,
        error: responseText,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log the failed CAPI event
    await db.insert(capiEvents).values({
      brandId,
      platform: "meta",
      eventName,
      eventId,
      eventData: payload as any,
      sentAt: new Date(),
      responseStatus: "500",
      responseBody: errorMessage,
    });

    return {
      success: false,
      eventId,
      error: errorMessage,
    };
  }
}

/**
 * Send purchase event to Meta CAPI
 */
export async function sendPurchaseEvent(
  brandId: string,
  orderId: string,
  value: number,
  currency: string,
  userData: Partial<MetaUserData>,
  contents?: Array<{ id: string; quantity: number; item_price: number }>
): Promise<CAPIEventResult> {
  return sendMetaEvent(
    brandId,
    "Purchase",
    userData,
    {
      value,
      currency,
      orderId,
      contents,
      numItems: contents?.reduce((sum, c) => sum + c.quantity, 0),
    },
    { eventId: `purchase_${orderId}` }
  );
}

/**
 * Send initiate checkout event to Meta CAPI
 */
export async function sendInitiateCheckoutEvent(
  brandId: string,
  value: number,
  currency: string,
  userData: Partial<MetaUserData>,
  contents?: Array<{ id: string; quantity: number; item_price: number }>
): Promise<CAPIEventResult> {
  return sendMetaEvent(
    brandId,
    "InitiateCheckout",
    userData,
    {
      value,
      currency,
      contentIds: contents?.map((c) => c.id),
      numItems: contents?.reduce((sum, c) => sum + c.quantity, 0),
    }
  );
}

/**
 * Send add to cart event to Meta CAPI
 */
export async function sendAddToCartEvent(
  brandId: string,
  value: number,
  currency: string,
  userData: Partial<MetaUserData>,
  contentIds: string[]
): Promise<CAPIEventResult> {
  return sendMetaEvent(
    brandId,
    "AddToCart",
    userData,
    {
      value,
      currency,
      contentIds,
    }
  );
}

/**
 * Send view content event to Meta CAPI
 */
export async function sendViewContentEvent(
  brandId: string,
  value: number,
  currency: string,
  userData: Partial<MetaUserData>,
  contentName: string,
  contentIds?: string[]
): Promise<CAPIEventResult> {
  return sendMetaEvent(
    brandId,
    "ViewContent",
    userData,
    {
      value,
      currency,
      contentName,
      contentIds,
      contentType: "product",
    }
  );
}

/**
 * Send lead event to Meta CAPI
 */
export async function sendLeadEvent(
  brandId: string,
  userData: Partial<MetaUserData>
): Promise<CAPIEventResult> {
  return sendMetaEvent(brandId, "Lead", userData);
}

/**
 * Send search event to Meta CAPI
 */
export async function sendSearchEvent(
  brandId: string,
  searchTerm: string,
  userData: Partial<MetaUserData>
): Promise<CAPIEventResult> {
  return sendMetaEvent(
    brandId,
    "Search",
    userData,
    {
      searchTerm,
    }
  );
}
