import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasBrandAccess } from "@/lib/auth";
import {
  sendMetaEvent,
  sendPurchaseEvent,
  sendInitiateCheckoutEvent,
  sendAddToCartEvent,
  sendViewContentEvent,
  sendLeadEvent,
  sendSearchEvent,
} from "@/lib/capi/meta";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST - Send a CAPI event
 */
export async function POST(
  req: Request,
  { params }: RouteContext
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: brandId } = await params;

  const role = await hasBrandAccess(session.user.id, brandId);
  if (role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      eventType,
      userData,
      customData,
      options,
    } = body;

    let result;

    switch (eventType) {
      case "Purchase":
        result = await sendPurchaseEvent(
          brandId,
          customData.orderId,
          customData.value,
          customData.currency,
          userData,
          customData.contents
        );
        break;

      case "InitiateCheckout":
        result = await sendInitiateCheckoutEvent(
          brandId,
          customData.value,
          customData.currency,
          userData,
          customData.contents
        );
        break;

      case "AddToCart":
        result = await sendAddToCartEvent(
          brandId,
          customData.value,
          customData.currency,
          userData,
          customData.contentIds
        );
        break;

      case "ViewContent":
        result = await sendViewContentEvent(
          brandId,
          customData.value,
          customData.currency,
          userData,
          customData.contentName,
          customData.contentIds
        );
        break;

      case "Lead":
        result = await sendLeadEvent(
          brandId,
          userData
        );
        break;

      case "Search":
        result = await sendSearchEvent(
          brandId,
          customData.searchTerm,
          userData
        );
        break;

      default:
        // Custom event
        result = await sendMetaEvent(
          brandId,
          eventType,
          userData,
          customData,
          options
        );
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending CAPI event:", error);
    return NextResponse.json(
      { error: "Failed to send CAPI event", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
