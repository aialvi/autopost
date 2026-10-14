import type { ShopifyWorkspaceResponse } from "@/lib/platforms/shopify/workspace";
import { getDemoBrands, getDemoProfit } from "./data";

export function getDemoShopify(brandId: string, tab: string, page: number): ShopifyWorkspaceResponse {
  const brand = getDemoBrands().find((brand) => brand.id === brandId)!;
  const now = new Date().toISOString();
  const startDate = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const endDate = now.slice(0, 10);
  const metrics = getDemoProfit(brandId, startDate, endDate, "overall").data;
  if (Array.isArray(metrics)) throw new Error("Invalid demo period");
  const allProducts = Array.from({ length: 13 }, (_, index) => ({ id: `sample-product-${index}`, brandId, shopifyProductId: 1000 + index, title: index === 0 ? "Classic Sneakers" : index === 1 ? "Canvas Tote Bag" : `Everyday Collection ${index + 1}`, handle: index === 0 ? "classic-sneakers" : `everyday-${index}`, imageUrl: "/images/marketing/shopify-workspace.webp", status: "active", createdAt: now, updatedAt: now, variants: [{ id: `sample-variant-${index}`, productId: `sample-product-${index}`, shopifyVariantId: 2000 + index, title: "Default", sku: `CS-${index + 1}`, price: "89.99", costPerItem: index === 1 ? null : "25.00", inventoryItemId: 3000 + index, createdAt: now, updatedAt: now }] }));
  const orders = [0, 1].map((index) => ({ id: `sample-order-${index}`, shopifyOrderId: 4000 + index, orderNumber: String(1042 + index), totalPrice: "89.99", refundAmount: index ? "20.00" : "0.00", financialStatus: index ? "partially_refunded" : "paid", fulfillmentStatus: "fulfilled", processedAt: now, cancelledAt: null, items: [{ id: `sample-item-${index}`, title: "Classic Sneakers", quantity: "1", costPerItem: "25.00", totalCost: "25.00" }] }));
  const ads = [{ id: "sample-ad", platformAdId: "5000", name: "Sneakers — everyday comfort", status: "active", creativeUrl: "https://sample-store.myshopify.com/products/classic-sneakers", creativeThumbnail: null, creativeBody: "Meet your new everyday favorites.", creativePostUrl: "https://www.facebook.com/1000_5000", updatedAt: now, campaignName: "Summer collection", product: { id: allProducts[0].id, title: allProducts[0].title, handle: allProducts[0].handle, shopifyProductId: 1000 } }];
  const total = tab === "products" ? allProducts.length : tab === "orders" ? orders.length : ads.length;
  return {
    demo: true, brand: { name: brand.name, currency: brand.currency, timezone: brand.timezone, defaultCogsPercentage: String(brand.defaultCogsPercentage) },
    connections: [{ platform: "shopify", accountId: "sample-store.myshopify.com", status: "active", lastSyncedAt: now }, { platform: "meta", accountId: "123456789", status: "active", lastSyncedAt: now }],
    summary: { ...metrics, grossSales: metrics.revenue + 20, refunds: 20, startDate, endDate },
    products: tab === "products" ? allProducts.slice((page - 1) * 12, page * 12) : [], orders: tab === "orders" ? orders.slice((page - 1) * 12, page * 12) : [], ads: tab === "ads" ? ads.slice((page - 1) * 12, page * 12) : [],
    logs: [{ id: "sample-sync", platform: "shopify", type: "orders", status: "success", startedAt: now, completedAt: now }], page, total, pageSize: 12,
  };
}
