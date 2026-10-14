import { db } from "@/lib/db";
import { adCampaigns, ads, brands, platformConnections, shopifyOrders, shopifyProducts, syncLogs } from "@/lib/db/schema";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { calculateProfitMetrics } from "@/lib/profit/calculations";
import { dateInTimezone } from "@/lib/telegram/time";
import { productHandleFromAd } from "../ads/creative";

export type StoreTab = "products" | "orders" | "ads";
export const STORE_PAGE_SIZE = 12;

// Callers must authorize brand membership before querying this workspace.
export async function getShopifyWorkspace(brandId: string, tab: StoreTab, page: number) {
  const brand = await db.query.brands.findFirst({ where: eq(brands.id, brandId) });
  if (!brand) throw new Error("Brand not found");
  const endDate = dateInTimezone(new Date(), brand.timezone);
  const start = new Date(`${endDate}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 29);
  const startDate = start.toISOString().slice(0, 10);
  const offset = (page - 1) * STORE_PAGE_SIZE;
  const localDate = sql<string>`TO_CHAR(${shopifyOrders.processedAt} AT TIME ZONE 'UTC' AT TIME ZONE ${brand.timezone}, 'YYYY-MM-DD')`;
  const periodOrders = and(eq(shopifyOrders.brandId, brandId), gte(localDate, startDate), lte(localDate, endDate), inArray(shopifyOrders.financialStatus, ["paid", "partially_refunded", "refunded"]));
  const [connections, metrics, totals, logs] = await Promise.all([
    db.select({ platform: platformConnections.platform, accountId: platformConnections.accountId, status: platformConnections.status, lastSyncedAt: platformConnections.lastSyncedAt, metadata: platformConnections.metadata }).from(platformConnections).where(and(eq(platformConnections.brandId, brandId), inArray(platformConnections.platform, ["shopify", "meta"]))),
    calculateProfitMetrics(brandId, { startDate, endDate }),
    db.select({ refunds: sql<string>`COALESCE(SUM(${shopifyOrders.refundAmount}), 0)`, grossSales: sql<string>`COALESCE(SUM(${shopifyOrders.totalPrice}), 0)` }).from(shopifyOrders).where(periodOrders),
    db.select({ id: syncLogs.id, platform: syncLogs.platform, type: syncLogs.syncType, status: syncLogs.status, startedAt: syncLogs.startedAt, completedAt: syncLogs.completedAt }).from(syncLogs).where(and(eq(syncLogs.brandId, brandId), inArray(syncLogs.platform, ["shopify", "meta"]))).orderBy(desc(syncLogs.startedAt)).limit(4),
  ]);
  const store = connections.find((connection) => connection.platform === "shopify");
  const domains = [store?.accountId, store?.metadata?.storefrontDomain].filter((domain): domain is string => !!domain);
  const products = tab === "products" ? await db.query.shopifyProducts.findMany({ where: eq(shopifyProducts.brandId, brandId), with: { variants: true }, orderBy: [desc(shopifyProducts.updatedAt), desc(shopifyProducts.id)], limit: STORE_PAGE_SIZE, offset }) : [];
  const orders = tab === "orders" ? await db.query.shopifyOrders.findMany({ columns: { id: true, shopifyOrderId: true, orderNumber: true, totalPrice: true, refundAmount: true, financialStatus: true, fulfillmentStatus: true, processedAt: true, cancelledAt: true }, where: eq(shopifyOrders.brandId, brandId), with: { items: { columns: { id: true, title: true, quantity: true, costPerItem: true, totalCost: true } } }, orderBy: [desc(shopifyOrders.processedAt), desc(shopifyOrders.id)], limit: STORE_PAGE_SIZE, offset }) : [];
  const adRows = tab === "ads" ? await db.select({ id: ads.id, platformAdId: ads.platformAdId, name: ads.name, status: ads.status, creativeUrl: ads.creativeUrl, creativeThumbnail: ads.creativeThumbnail, creativeBody: ads.creativeBody, creativePostUrl: ads.creativePostUrl, updatedAt: ads.updatedAt, campaignName: adCampaigns.name }).from(ads).innerJoin(adCampaigns, eq(ads.campaignId, adCampaigns.id)).where(and(eq(adCampaigns.brandId, brandId), eq(adCampaigns.platform, "meta"))).orderBy(desc(ads.updatedAt), desc(ads.id)).limit(STORE_PAGE_SIZE).offset(offset) : [];
  const handles = adRows.map((ad) => productHandleFromAd(ad.creativeUrl, domains)).filter((handle): handle is string => !!handle);
  const matchedProducts = handles.length ? await db.select({ id: shopifyProducts.id, title: shopifyProducts.title, handle: shopifyProducts.handle, shopifyProductId: shopifyProducts.shopifyProductId }).from(shopifyProducts).where(and(eq(shopifyProducts.brandId, brandId), inArray(shopifyProducts.handle, handles))) : [];
  const adCards = adRows.map((ad) => ({ ...ad, product: matchedProducts.find((product) => product.handle === productHandleFromAd(ad.creativeUrl, domains)) ?? null }));
  const [total] = tab === "products" ? await db.select({ count: count() }).from(shopifyProducts).where(eq(shopifyProducts.brandId, brandId)) : tab === "orders" ? await db.select({ count: count() }).from(shopifyOrders).where(eq(shopifyOrders.brandId, brandId)) : await db.select({ count: count() }).from(ads).innerJoin(adCampaigns, eq(ads.campaignId, adCampaigns.id)).where(and(eq(adCampaigns.brandId, brandId), eq(adCampaigns.platform, "meta")));
  return {
    brand: { name: brand.name, currency: brand.currency, timezone: brand.timezone, defaultCogsPercentage: brand.defaultCogsPercentage },
    connections: connections.map((connection) => ({ platform: connection.platform, accountId: connection.accountId, status: connection.status, lastSyncedAt: connection.lastSyncedAt })),
    summary: { ...metrics, refunds: Number(totals[0].refunds), grossSales: Number(totals[0].grossSales), startDate, endDate },
    products, orders, ads: adCards, logs, page, total: total.count, pageSize: STORE_PAGE_SIZE,
  };
}

export type ShopifyWorkspace = Awaited<ReturnType<typeof getShopifyWorkspace>>;
// JSON dates are strings on the client.
export type Serialized<T> = T extends Date ? string : T extends Array<infer U> ? Serialized<U>[] : T extends object ? { [K in keyof T]: Serialized<T[K]> } : T;
export type ShopifyWorkspaceResponse = Serialized<ShopifyWorkspace> & { demo?: boolean };
