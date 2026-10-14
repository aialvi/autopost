import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

 test("Neon profit reports reconcile real stored sales, refunds, COGS fallback, fees, spend and expenses", { skip: !process.env.DATABASE_URL }, async () => {
  const { db } = await import("../src/lib/db");
  const schema = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const { calculateProfitMetrics, getDailyProfitData, getWeeklyProfitData, getMonthlyProfitData, getPlatformProfitBreakdown } = await import("../src/lib/profit/calculations");
  const brandId = randomUUID();
  const first = randomUUID(), second = randomUUID(), refunded = randomUUID();
  await db.insert(schema.brands).values({ id: brandId, name: "Automated verification", slug: `verification-${brandId}`, timezone: "UTC", currency: "USD", defaultCogsPercentage: "25" });
  try {
    await db.insert(schema.shopifyOrders).values([
      { id: first, brandId, shopifyOrderId: 1001, orderNumber: "1", emailHash: "test", totalPrice: "200", financialStatus: "paid", processedAt: new Date("2026-10-10T12:00:00Z") },
      { id: second, brandId, shopifyOrderId: 1002, orderNumber: "2", emailHash: "test", totalPrice: "300", refundAmount: "50", financialStatus: "partially_refunded", processedAt: new Date("2026-10-10T13:00:00Z") },
      { id: refunded, brandId, shopifyOrderId: 1003, orderNumber: "3", emailHash: "test", totalPrice: "100", refundAmount: "100", financialStatus: "refunded", processedAt: new Date("2026-10-11T12:00:00Z") },
    ]);
    await db.insert(schema.shopifyOrderItems).values([
      { orderId: first, shopifyLineItemId: 2001, title: "Default cost", quantity: "2", price: "100", totalCost: null },
      { orderId: second, shopifyLineItemId: 2002, title: "Known cost", quantity: "1", price: "300", totalCost: "90" },
      { orderId: refunded, shopifyLineItemId: 2003, title: "Refunded", quantity: "1", price: "100", totalCost: "30" },
    ]);
    await db.insert(schema.transactionFees).values([
      { orderId: first, gateway: "test", feePercentage: "0", feeFixed: "6", feeAmount: "6" },
      { orderId: second, gateway: "test", feePercentage: "0", feeFixed: "9", feeAmount: "9" },
      { orderId: refunded, gateway: "test", feePercentage: "0", feeFixed: "3", feeAmount: "3" },
    ]);
    await db.insert(schema.adDataSnapshots).values([
      { brandId, platform: "meta", date: "2026-10-10", spend: "10", revenueReported: "100" },
      { brandId, platform: "google", date: "2026-10-10", spend: "20", revenueReported: "50" },
      { brandId, platform: "meta", date: "2026-10-11", spend: "5", revenueReported: "0" },
    ]);
    await db.insert(schema.customExpenses).values([
      { brandId, name: "Launch", amount: "12", frequency: "one_time", startDate: "2026-10-10" },
      { brandId, name: "Daily", amount: "2", frequency: "daily", startDate: "2026-10-11", endDate: "2026-10-11" },
    ]);
    const period = { startDate: "2026-10-10", endDate: "2026-10-11" };
    const [overall, daily, weekly, monthly, breakdown] = await Promise.all([calculateProfitMetrics(brandId, period), getDailyProfitData(brandId, period), getWeeklyProfitData(brandId, period), getMonthlyProfitData(brandId, period), getPlatformProfitBreakdown(brandId, period)]);
    assert.equal(overall.revenue, 450); assert.equal(overall.cogs, 170); assert.equal(overall.transactionFees, 18); assert.equal(overall.adSpend, 35); assert.equal(overall.customExpenses, 14); assert.equal(overall.netProfit, 213);
    assert.equal(daily[0].metrics.netProfit, 253); assert.equal(daily[1].metrics.netProfit, -40);
    assert.equal(weekly[0].metrics.netProfit, 213); assert.equal(monthly[0].metrics.netProfit, 213);
    assert.equal(breakdown.meta.revenue, 100); assert.equal(breakdown.google.roas, 2.5);
    // A UTC timestamp near midnight belongs to the previous day in New York.
    await db.update(schema.brands).set({ timezone: "America/New_York" }).where(eq(schema.brands.id, brandId));
    await db.update(schema.shopifyOrders).set({ processedAt: new Date("2026-10-11T02:00:00Z") }).where(eq(schema.shopifyOrders.id, first));
    const shifted = await calculateProfitMetrics(brandId, { startDate: "2026-10-10", endDate: "2026-10-10" });
    assert.equal(shifted.revenue, 450);
  } finally { await db.delete(schema.brands).where(eq(schema.brands.id, brandId)); }
});

test("repeated Meta syncs update one Neon snapshot and preserve actual purchase revenue", { skip: !process.env.DATABASE_URL }, async () => {
  const { db } = await import("../src/lib/db"); const schema = await import("../src/lib/db/schema"); const { eq } = await import("drizzle-orm");
  const { syncAdData } = await import("../src/lib/platforms/ads/sync");
  const id = randomUUID(); const fetchOriginal = globalThis.fetch; let spend = "10";
  await db.insert(schema.brands).values({id,name:"Sync verification",slug:`sync-verification-${id}`});
  try {
    globalThis.fetch = async (input, init) => {
      if (!String(input).includes("graph.facebook.com")) return fetchOriginal(input, init);
      const data = String(input).includes("/ads?") ? [{id:"ad-1",name:"Sneaker ad",status:"ACTIVE",creative:{thumbnail_url:"https://example.com/ad.jpg",object_story_spec:{link_data:{link:"https://store.myshopify.com/products/sneaker",message:"Try our sneakers"}}}}] : String(input).includes("/insights?") ? [{spend,impressions:"100",clicks:"10",actions:[{action_type:"purchase",value:"2"}],action_values:[{action_type:"purchase",value:"70"}]}] : [{id:"9001",name:"Verified campaign",status:"ACTIVE",objective:"SALES",daily_budget:"1000"}];
      return new Response(JSON.stringify({data}),{headers:{"Content-Type":"application/json"}});
    };
    const config = {platform:"meta" as const,accessToken:"fake",accountId:"fake"};
    assert.equal((await syncAdData(id,config,"2026-10-14")).errors,0);spend="20";
    assert.equal((await syncAdData(id,config,"2026-10-14")).errors,0);
    const records=await db.query.adDataSnapshots.findMany({where:eq(schema.adDataSnapshots.brandId,id)});
    assert.equal(records.length,1);assert.equal(Number(records[0].spend),20);assert.equal(Number(records[0].revenueReported),70);
    const campaigns = await db.query.adCampaigns.findMany({where:eq(schema.adCampaigns.brandId,id)});
    const creatives = await db.query.ads.findMany({where:eq(schema.ads.campaignId,campaigns[0].id)});
    assert.equal(creatives.length,1);assert.equal(creatives[0].creativeBody,"Try our sneakers");
    await db.delete(schema.ads).where(eq(schema.ads.campaignId,campaigns[0].id));
  } finally { globalThis.fetch=fetchOriginal; await db.delete(schema.brands).where(eq(schema.brands.id,id)); }
});
