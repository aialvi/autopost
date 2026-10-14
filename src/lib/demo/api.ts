import { NextResponse } from "next/server";
import { isDemoBrand, isDemoEnabled, isDemoUser } from "./config";
import { getDemoAI, getDemoBrands, getDemoCapiEvents, getDemoComparison, getDemoConnection, getDemoInvoices, getDemoNotifications, getDemoOverview, getDemoPreferences, getDemoProfit, getDemoSubscription } from "./data";

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const bounded = (value: string | null, fallback: number, max: number) => Math.min(max, Math.max(1, Number.parseInt(value ?? "", 10) || fallback));

// Called inside route handlers after reading the signed session. Demo requests
// terminate here, before any database, platform, notification, or billing call.
export function getDemoApiResponse(userId: string | undefined, request: Request): NextResponse | null {
  if (!isDemoUser(userId)) return null;
  if (!isDemoEnabled()) return json({ error: "The demo is currently unavailable." }, 403);
  if (request.method !== "GET") return json({ error: "The demo workspace is read-only. Create your own account to make changes." }, 403);

  const url = new URL(request.url);
  if (url.pathname === "/api/brands") return json(getDemoBrands());
  if (url.pathname === "/api/dashboard/compare") {
    const ids = [...new Set((url.searchParams.get("brandIds") ?? "").split(","))];
    if (ids.length < 2 || ids.length > 5) return json({ error: "Choose between two and five demo brands." }, 400);
    if (!ids.every(isDemoBrand)) return json({ error: "Forbidden" }, 403);
    return json({ comparisons: getDemoComparison(ids) });
  }

  const overview = url.pathname.match(/^\/api\/dashboard\/([^/]+)\/overview$/);
  const brandRoute = url.pathname.match(/^\/api\/brands\/([^/]+)(?:\/(.*))?$/);
  const brandId = overview?.[1] ?? brandRoute?.[1];
  if (!brandId || !isDemoBrand(brandId)) return json({ error: "This resource is not part of the demo workspace." }, 403);
  if (overview) return json(getDemoOverview(brandId));

  const section = brandRoute?.[2] ?? "";
  const now = new Date();
  const endDate = url.searchParams.get("endDate") ?? now.toISOString().slice(0, 10);
  const startDate = url.searchParams.get("startDate") ?? new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  try {
    switch (section) {
      case "": return json(getDemoBrands().find((brand) => brand.id === brandId));
      case "profit": {
        const granularity = url.searchParams.get("granularity") ?? "overall";
        if (!["daily", "weekly", "monthly", "overall"].includes(granularity)) return json({ error: "Invalid granularity" }, 400);
        return json(getDemoProfit(brandId, startDate, endDate, granularity));
      }
      case "ai": {
        // Validate the selected period even though these are illustrative insights.
        getDemoProfit(brandId, startDate, endDate, "overall");
        const data = getDemoAI(brandId);
        const type = url.searchParams.get("type") ?? "all";
        if (type === "all") return json({ dateRange: { startDate, endDate }, ...data });
        if (!(type in data)) return json({ error: "Invalid analysis type" }, 400);
        return json({ dateRange: { startDate, endDate }, [type]: data[type as keyof typeof data] });
      }
      case "attribution": {
        const model = url.searchParams.get("model") ?? "last_click";
        const weights: Record<string, number[]> = {
          last_click: [0.40, 0.32, 0.16, 0.06, 0.04, 0.02],
          first_click: [0.33, 0.24, 0.22, 0.12, 0.04, 0.05],
          linear: [0.35, 0.28, 0.18, 0.09, 0.05, 0.05],
          time_decay: [0.38, 0.30, 0.17, 0.08, 0.04, 0.03],
          position_based: [0.36, 0.29, 0.19, 0.08, 0.04, 0.04],
        };
        if (!weights[model]) return json({ error: "Invalid attribution model" }, 400);
        const total = getDemoProfit(brandId, startDate, endDate, "overall").data;
        if (Array.isArray(total)) throw new Error("Invalid period");
        const byPlatform = ["meta", "google", "tiktok", "snapchat", "email", "organic"].map((platform, index) => ({ platform, attributedRevenue: Math.round(total.revenue * weights[model][index] * 100) / 100, conversions: Math.round(total.orders * weights[model][index]) }));
        return json({ dateRange: { startDate, endDate }, model, byPlatform, byCampaign: getDemoOverview(brandId).topCampaigns.map((campaign, index) => ({ campaignId: campaign.id, campaignName: campaign.name, attributedRevenue: byPlatform[index].attributedRevenue, conversions: byPlatform[index].conversions })) });
      }
      case "notifications": return json({ preferences: getDemoPreferences() });
      case "notifications/logs": {
        const page = bounded(url.searchParams.get("page"), 1, 100);
        const limit = bounded(url.searchParams.get("limit"), 20, 100);
        return json({ logs: getDemoNotifications().slice((page - 1) * limit, page * limit) });
      }
      case "billing/subscription": return json(getDemoSubscription());
      case "billing/invoices": return json({ invoices: getDemoInvoices().slice(0, bounded(url.searchParams.get("limit"), 20, 100)) });
      case "capi": {
        const platform = url.searchParams.get("platform");
        return json({ events: getDemoCapiEvents().filter((event) => !platform || event.platform === platform).slice(0, bounded(url.searchParams.get("limit"), 50, 100)) });
      }
      case "sync": return json({ connections: ["meta", "snapchat", "google", "tiktok"].map((platform) => getDemoConnection(brandId, platform)) });
      default: {
        const platform = section.match(/^connections\/(shopify|meta|snapchat|google|tiktok)$/)?.[1];
        if (platform) return json({ connected: true, connection: getDemoConnection(brandId, platform) });
        return json({ error: "This resource is not part of the demo workspace." }, 404);
      }
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid demo request" }, 400);
  }
}
