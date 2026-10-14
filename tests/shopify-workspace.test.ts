import test from "node:test";
import assert from "node:assert/strict";
import { successfulRefundAmount } from "../src/lib/platforms/shopify/refunds";
import { metaCreative, productHandleFromAd, safeWebUrl } from "../src/lib/platforms/ads/creative";
import { ShopifyClient, type ShopifyRefund } from "../src/lib/platforms/shopify/client";
import type { MetaAd } from "../src/lib/platforms/meta/client";
import { getDemoApiResponse } from "../src/lib/demo/api";
import { DEMO_BRAND_IDS, DEMO_USER_ID } from "../src/lib/demo/config";

test("only successful refunds reduce sales", () => {
  const refunds: ShopifyRefund[] = [{ created_at: "2026-10-15", transactions: [
    { amount: "20", kind: "refund", status: "success" },
    { amount: "40", kind: "refund", status: "pending" },
    { amount: "50", kind: "refund", status: "failure" },
    { amount: "100", kind: "sale", status: "success" },
  ] }];
  assert.equal(successfulRefundAmount(refunds), 20);
  assert.equal(successfulRefundAmount(), 0);
  assert.throws(() => successfulRefundAmount([{ created_at: "", transactions: [{ amount: "bad", kind: "refund", status: "success" }] }]));
});

test("ad product matching verifies store domain and handles collection paths and tracking parameters", () => {
  const domains = ["store.myshopify.com", "shop.example.com"];
  assert.equal(productHandleFromAd("https://shop.example.com/collections/summer/products/classic-sneakers?variant=123&utm_source=meta", domains), "classic-sneakers");
  assert.equal(productHandleFromAd("https://other.example.com/products/classic-sneakers", domains), null);
  assert.equal(productHandleFromAd("https://shop.example.com/collections/summer", domains), null);
  assert.equal(productHandleFromAd("javascript:alert(1)", domains), null);
  assert.equal(productHandleFromAd("https://shop.example.com/products/%GG", domains), null);
  assert.equal(safeWebUrl("https://user:password@example.com"), null);
});

test("Meta creative extracts copy, thumbnail, product destination and published post safely", () => {
  const ad = { creative: { thumbnail_url: "https://cdn.example.com/ad.jpg", effective_object_story_id: "123_456", object_story_spec: { link_data: { link: "https://shop.example.com/products/shoe", message: "Try our shoes" } } } } as MetaAd;
  assert.deepEqual(metaCreative(ad), { creativeUrl: "https://shop.example.com/products/shoe", creativeThumbnail: "https://cdn.example.com/ad.jpg", creativeBody: "Try our shoes", creativePostUrl: "https://www.facebook.com/123_456" });
  assert.equal(metaCreative({ ...ad, creative: { instagram_permalink_url: "https://www.instagram.com/p/example/" } }).creativePostUrl, "https://www.instagram.com/p/example/");
  assert.equal(metaCreative({ ...ad, creative: { object_url: "javascript:alert(1)", thumbnail_url: "data:text/html,bad" } }).creativeThumbnail, null);
});

test("Shopify imports archived products and rejects repeated page cursors", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.has("status"), false);
    return new Response(JSON.stringify({ products: [{ id: 1, status: "archived" }] }));
  };
  const client = new ShopifyClient({ storeDomain: "store.myshopify.com", accessToken: "test" });
  await assert.rejects(client.getProducts({ limit: 1 }), /repeated product cursor/);
});

test("Shopify demo supports pagination, refunds, linked ads and rejects cross-brand reads and writes", async () => {
  const request = (query = "", method = "GET", brand = DEMO_BRAND_IDS[0] as string) => getDemoApiResponse(DEMO_USER_ID, new Request(`https://autopost.example/api/brands/${brand}/shopify${query}`, { method }))!;
  const first = await request().json();
  const second = await request("?page=2").json();
  assert.equal(first.products.length, 12); assert.equal(second.products.length, 1);
  assert.notEqual(first.products[0].id, second.products[0].id);
  assert.equal((await request("?tab=orders").json()).orders[1].refundAmount, "20.00");
  assert.equal((await request("?tab=ads").json()).ads[0].product.title, "Classic Sneakers");
  for (const query of ["?page=-1", "?page=1.5", "?tab=unknown"]) assert.equal(request(query).status, 400);
  assert.equal(request("", "POST").status, 403);
  assert.equal(request("", "GET", "11111111-1111-4111-8111-111111111111").status, 403);
  assert.equal(JSON.stringify(first).includes("accessToken"), false);
});
