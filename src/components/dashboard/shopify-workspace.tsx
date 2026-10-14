"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShopifyWorkspaceResponse, StoreTab } from "@/lib/platforms/shopify/workspace";
import { safeWebUrl } from "@/lib/platforms/ads/creative";

function ExternalLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  const safe = safeWebUrl(href);
  return safe ? <a className="text-sm font-medium text-primary underline underline-offset-4" href={safe} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a> : null;
}

function PreviewImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const safe = src?.startsWith("/images/") ? src : safeWebUrl(src);
  // Images come from connected stores and ad accounts; no optimizer proxy is needed.
  // eslint-disable-next-line @next/next/no-img-element
  return safe && !failed ? <img src={safe} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full rounded-lg bg-muted object-contain" onError={() => setFailed(true)} /> : <div className="flex h-44 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">Preview unavailable</div>;
}

export function ShopifyWorkspaceView({ brandId, canEdit }: { brandId: string; canEdit: boolean }) {
  const [tab, setTab] = useState<StoreTab>("products");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<ShopifyWorkspaceResponse>(`/api/brands/${brandId}/shopify?tab=${tab}&page=${page}`, async (url: string) => {
    const response = await fetch(url);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load Shopify data");
    return body;
  }, { refreshInterval: 30000 });

  async function sync(platform: "shopify" | "meta") {
    setSyncing(platform); setFeedback(null);
    try {
      const response = await fetch(`/api/brands/${brandId}/sync${platform === "shopify" ? "/shopify" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(platform === "shopify" ? { type: "all" } : { platform }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Sync failed. Check your connection and retry.");
      setFeedback(body.result?.errors ? "Some records could not sync. Check your connection permissions and retry." : "Sync complete.");
      await mutate();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Sync failed"); }
    finally { setSyncing(null); }
  }

  if (isLoading) return <p role="status">Loading Shopify workspace…</p>;
  if (error || !data) return <div role="alert" className="space-y-3"><p>{error?.message ?? "Could not load Shopify data"}</p><Button onClick={() => mutate()}>Retry</Button></div>;
  const money = (value: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: data.brand.currency }).format(Number(value));
  const date = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: data.brand.timezone, dateStyle: "medium" }).format(new Date(value));
  const store = data.connections.find((connection) => connection.platform === "shopify");
  const meta = data.connections.find((connection) => connection.platform === "meta");
  const admin = store && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(store.accountId) ? `https://${store.accountId}/admin` : null;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Shopify & ads</h1><p className="text-muted-foreground">{data.brand.name} · Products, orders, refunds, and marketing</p></div>
      <Button variant="outline" asChild><Link href={`/dashboard/brands/${brandId}/settings`}>Manage connections</Link></Button>
    </div>
    {data.demo && <p className="rounded-lg bg-muted p-3 text-sm">Sample data · This demo is read-only.</p>}
    <Card><CardHeader><CardTitle>Store sync</CardTitle><CardDescription>Products and orders sync after connecting, then on the scheduled hourly job. Available order history depends on your Shopify permissions.</CardDescription></CardHeader><CardContent className="space-y-3">
      <p className="break-words text-sm">{store ? `${store.accountId} · ${store.status} · ${store.lastSyncedAt ? `Last successful full sync: ${date(store.lastSyncedAt)}` : "Awaiting first successful sync"}` : "Connect Shopify in brand settings to import your products, orders, and costs."}</p>
      <div className="flex flex-wrap gap-2"><Button disabled={!canEdit || !!syncing || store?.status !== "active"} onClick={() => sync("shopify")}>{syncing === "shopify" ? "Syncing store…" : "Sync Shopify"}</Button><Button variant="outline" onClick={() => mutate()}>Refresh</Button><Button variant="outline" asChild><Link href={`/dashboard/profit?brandId=${brandId}`}>View P&L</Link></Button></div>
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
      {data.logs.length > 0 && <details className="text-sm"><summary className="cursor-pointer">Recent sync activity</summary><ul className="mt-2 space-y-1">{data.logs.map((log) => <li key={log.id}>{log.platform} · {log.type.replaceAll("_", " ")} · {log.status} · {date(log.startedAt)}</li>)}</ul></details>}
    </CardContent></Card>
    <div><h2 className="mb-3 text-lg font-semibold">Sales overview · Last 30 days</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Sales before refunds", money(data.summary.grossSales)], ["Refunds", money(data.summary.refunds)], ["Sales after refunds", money(data.summary.revenue)], ["Product costs in P&L", money(data.summary.cogs)],
    ].map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>)}</div><p className="mt-3 text-xs text-muted-foreground">{data.summary.startDate} – {data.summary.endDate} · {data.brand.timezone}. Paid and refunded orders, including shipping and taxes. Refunds are applied to the original order date. Missing product costs use your {data.brand.defaultCogsPercentage}% default COGS estimate; processing fees in P&L are estimates.</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Shopify views">{(["products", "orders", "ads"] as const).map((value) => <Button key={value} variant={tab === value ? "default" : "outline"} aria-pressed={tab === value} onClick={() => { setTab(value); setPage(1); }}>{value === "ads" ? "Ads & posts" : value === "orders" ? "Orders & refunds" : "Products & costs"}</Button>)}</div>
    {tab === "products" && <section aria-label="Products and costs" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.products.map((product) => <Card key={product.id} className="min-w-0"><CardHeader><PreviewImage src={product.imageUrl} alt={product.title} /><CardTitle className="break-words pt-3 text-lg">{product.title}</CardTitle><CardDescription className="capitalize">{product.status}</CardDescription></CardHeader><CardContent className="space-y-3"><ul className="space-y-3 text-sm">{product.variants.map((variant) => <li key={variant.id} className="border-b pb-2"><p className="break-words font-medium">{variant.title}</p><p className="break-words text-muted-foreground">SKU: {variant.sku || "Not set"}</p><p>Price: {money(variant.price)} · Cost: {variant.costPerItem === null ? "Not set — P&L uses estimate" : money(variant.costPerItem)}</p></li>)}</ul><ExternalLink href={admin ? `${admin}/products/${product.shopifyProductId}` : null}>Open product in Shopify</ExternalLink></CardContent></Card>)}</section>}
    {tab === "orders" && <section aria-label="Orders and refunds" className="space-y-3">{data.orders.map((order) => <Card key={order.id}><CardHeader><CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle><CardDescription>{order.processedAt ? date(order.processedAt) : "Date unavailable"} · {order.financialStatus?.replaceAll("_", " ")} · {order.cancelledAt ? "Cancelled" : order.fulfillmentStatus || "Unfulfilled"}</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-4 text-sm"><span>Sale: {money(order.totalPrice)}</span><span>Refund: {money(order.refundAmount)}</span><span>After refund: {money(Number(order.totalPrice) - Number(order.refundAmount))}</span></div><ul className="space-y-1 text-sm text-muted-foreground">{order.items.map((item) => <li key={item.id}>{item.quantity} × {item.title} · Unit cost: {item.costPerItem === null ? "Default estimate" : money(item.costPerItem)}</li>)}</ul><ExternalLink href={admin ? `${admin}/orders/${order.shopifyOrderId}` : null}>Open order in Shopify</ExternalLink></CardContent></Card>)}</section>}
    {tab === "ads" && <section aria-label="Ads and posts" className="space-y-4"><div className="space-y-3"><p className="text-sm text-muted-foreground">Facebook and Instagram ads from this brand’s connected Meta account{meta ? ` (${meta.accountId})` : ""}. Product links are matched using the ad destination. Catalog ads and collection links may not identify a single product. Post links open the published post when available.</p><p className="text-xs text-muted-foreground">{meta?.lastSyncedAt ? `Last successful ad sync: ${date(meta.lastSyncedAt)}` : "Connect Meta in brand settings, then sync ads to load previews."} Organic posts are not imported.</p><Button disabled={!canEdit || !!syncing || meta?.status !== "active"} onClick={() => sync("meta")}>{syncing === "meta" ? "Syncing ads…" : "Sync Meta ads"}</Button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.ads.map((ad) => <Card key={ad.id} className="min-w-0"><CardHeader><PreviewImage src={ad.creativeThumbnail} alt={ad.name} /><CardTitle className="break-words pt-3 text-lg">{ad.name}</CardTitle><CardDescription>{ad.campaignName} · {ad.status}</CardDescription></CardHeader><CardContent className="space-y-3"><p className="whitespace-pre-wrap break-words text-sm">{ad.creativeBody || "Ad copy unavailable"}</p><p className="text-sm">{ad.product ? `Product: ${ad.product.title}` : "No single product matched"}</p><div className="flex flex-wrap gap-3"><ExternalLink href={ad.creativeUrl}>View destination</ExternalLink><ExternalLink href={ad.creativePostUrl}>View post</ExternalLink><ExternalLink href={meta && /^\d+$/.test(meta.accountId.replace(/^act_/, "")) && /^\d+$/.test(ad.platformAdId) ? `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${meta.accountId.replace(/^act_/, "")}&selected_ad_ids=${ad.platformAdId}` : null}>Open ad in Meta</ExternalLink>{ad.product && <ExternalLink href={admin ? `${admin}/products/${ad.product.shopifyProductId}` : null}>View Shopify product</ExternalLink>}</div></CardContent></Card>)}</div></section>}
    {data.total === 0 && <p className="rounded-lg border p-8 text-center text-muted-foreground">{tab === "ads" ? "No ads synced yet. Connect Meta and sync your ads to see them here." : `No ${tab} synced yet. Connect Shopify and sync your store to get started.`}</p>}
    {data.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{data.total} {tab} · Page {page} of {pages}</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>}
  </div>;
}
