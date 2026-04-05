import { NextRequest, NextResponse } from "next/server";
import { trackPixelEvent } from "@/lib/attribution/tracking";
import { randomUUID } from "crypto";

/**
 * POST - Track a pixel event (client-side)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.brandId || !body.eventType || !body.sessionId || !body.pageUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate event ID if not provided
    const eventId = body.eventId || randomUUID();

    // Track the pixel event
    await trackPixelEvent({
      brandId: body.brandId,
      eventType: body.eventType,
      eventId,
      sessionId: body.sessionId,
      userAgent: body.userAgent,
      ipHash: body.ipHash,
      referrer: body.referrer,
      pageUrl: body.pageUrl,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      utmTerm: body.utmTerm,
      eventData: body.eventData,
    });

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error("Error tracking pixel event:", error);
    return NextResponse.json(
      { error: "Failed to track pixel event" },
      { status: 500 }
    );
  }
}
