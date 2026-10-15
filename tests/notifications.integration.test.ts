import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

test("Telegram honors preferences, deduplicates concurrent summaries, and records delivery failures", { skip: !process.env.DATABASE_URL }, async () => {
 const token=process.env.TELEGRAM_BOT_TOKEN;process.env.TELEGRAM_BOT_TOKEN="fake-test-token";
 const {db}=await import("../src/lib/db");const schema=await import("../src/lib/db/schema");const {eq}=await import("drizzle-orm");
 const {sendDailySummary,sendLowRoasAlert}=await import("../src/lib/telegram/notifications");
 const brandId=randomUUID(),userId=randomUUID();const originalFetch=globalThis.fetch;let deliveries=0;let fail=false;
 await db.insert(schema.users).values({id:userId,email:`verify-${userId}@example.invalid`,name:"Notification verification"});
 await db.insert(schema.brands).values({id:brandId,slug:`notif-${brandId}`,name:"Notification verification"});
 try {
  await db.insert(schema.brandUsers).values({brandId,userId,role:"owner"});
  await db.insert(schema.notificationPreferences).values({brandId,userId,telegramChatId:"test-chat",alertOnDailySummary:false});
  globalThis.fetch=async(input,init)=>{
   if(!String(input).startsWith("https://api.telegram.org/"))return originalFetch(input,init);
   deliveries++;return new Response(JSON.stringify(fail?{ok:false,description:"Test failure"}:{ok:true,result:{message_id:1}}));
  };
  const summary={brandId,brandName:"Test",currency:"USD",netProfit:50,date:"2026-10-14",revenue:100,orders:2,adSpend:20,roas:5,topCampaigns:[]};
  await sendDailySummary(summary);assert.equal(deliveries,0);
  await db.update(schema.notificationPreferences).set({alertOnDailySummary:true}).where(eq(schema.notificationPreferences.brandId,brandId));
  await Promise.all([sendDailySummary(summary),sendDailySummary(summary)]);assert.equal(deliveries,1);
  const logs=await db.query.notificationLogs.findMany({where:eq(schema.notificationLogs.brandId,brandId)});assert.equal(logs.length,1);assert.equal(logs[0].status,"sent");
  fail=true;await assert.rejects(()=>sendLowRoasAlert({brandId,campaignName:"Test",platform:"meta",currentRoas:0.5,threshold:1,adSpend:20}),/Telegram delivery failed/);
  const errors=await db.query.notificationLogs.findMany({where:eq(schema.notificationLogs.brandId,brandId)});assert.ok(errors.some(log=>log.status==="failed"));
 }finally{
  globalThis.fetch=originalFetch;if(token)process.env.TELEGRAM_BOT_TOKEN=token;else delete process.env.TELEGRAM_BOT_TOKEN;
  await db.delete(schema.notificationLogs).where(eq(schema.notificationLogs.brandId,brandId));
  await db.delete(schema.notificationPreferences).where(eq(schema.notificationPreferences.brandId,brandId));
  await db.delete(schema.brands).where(eq(schema.brands.id,brandId));await db.delete(schema.users).where(eq(schema.users.id,userId));
 }
});
