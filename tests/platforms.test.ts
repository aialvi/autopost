import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { GoogleAdsClient } from "../src/lib/platforms/google/client";
import { TikTokClient } from "../src/lib/platforms/tiktok/client";
import { SnapchatClient } from "../src/lib/platforms/snapchat/client";
import { MetaClient } from "../src/lib/platforms/meta/client";
import { ShopifyClient } from "../src/lib/platforms/shopify/client";
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function mockFetch(t: TestContext, handler: typeof fetch) {
 const previous = globalThis.fetch; globalThis.fetch = handler;
 t.after(()=>{globalThis.fetch=previous;});
}

test("Google uses nested REST rows, pagination, campaign filtering and actual conversion revenue", async t => {
 let pages=0;
 mockFetch(t,async (input,init)=> {
  const url=String(input);
  if(url.includes('oauth2.googleapis.com'))return response({access_token:'fake',expires_in:3600});
  assert.ok(url.includes('/v25/customers/123456/googleAds:search'));
  const body=JSON.parse(String(init?.body));
  if(body.query.includes('metrics.')){
   assert.ok(body.query.includes('campaign.id = 11'));
   return response({results:[{campaign:{id:'11'},metrics:{costMicros:'12000000',conversions:2.5,conversionsValue:85.4,impressions:'1000',clicks:'20'}}]});
  }
  pages++;
  return response({results:[{campaign:{id:String(pages),name:'Campaign',status:'ENABLED',advertisingChannelType:'SEARCH'}}],...(pages===1?{nextPageToken:'page-2'}:{})});
 });
 const client=new GoogleAdsClient({developerToken:'fake',clientId:'fake',clientSecret:'fake',refreshToken:'fake',customerId:'123-456'});
 assert.equal((await client.getCampaigns()).length,2);
 const stats=(await client.getStats('campaign','2026-10-14','2026-10-14','11'))[0];
 assert.equal(stats.conversions_value,85.4);assert.equal(GoogleAdsClient.microsToDollars(stats.cost_micros),12);
 await assert.rejects(()=>client.getStats('campaign','2026-10-14','2026-10-14',"11 OR 1=1"));
});
test("TikTok preserves large advertiser IDs and uses GET report envelopes",async t=>{
 const advertiser='1234567890123456789';
 mockFetch(t,async(input,init)=>{
  const url=new URL(String(input));assert.notEqual(init?.method,'POST');
  if(url.pathname.includes('oauth2/advertiser'))return response({code:0,data:{list:[{advertiser_id:advertiser}]}});
  assert.equal(url.searchParams.get('advertiser_id'),advertiser);
  if(url.pathname.includes('campaign/get'))return response({code:0,data:{list:[{campaign_id:'111',campaign_name:'Creator',operation_status:'ENABLE',objective_type:'WEB_CONVERSIONS',budget:'100'}],page_info:{total_page:1}}});
  assert.ok(url.pathname.includes('/report/integrated/get/'));assert.equal(url.searchParams.get('start_date'),'2026-10-14');assert.equal(url.searchParams.get('data_level'),'AUCTION_CAMPAIGN');
  return response({code:0,data:{list:[{metrics:{spend:'10.5',clicks:'20',impressions:'400',complete_payment:'3',total_purchase_value:'90'}}]}});
 });
 const client=new TikTokClient({appId:'fake',appSecret:'fake',accessToken:'fake'});
 assert.equal((await client.getAdAccounts())[0].advertiser_id,advertiser);
 assert.equal((await client.getCampaigns(advertiser))[0].status,'ENABLE');
 const stats=(await client.getStats(advertiser,'CAMPAIGN',['111'],'2026-10-14','2026-10-14'))[0];assert.equal(stats.revenue,90);assert.equal(stats.spend,10.5);
});
test("TikTok rejects HTTP 200 API errors rather than silently returning empty data",async t=>{
 mockFetch(t,async()=>response({code:40001,message:'Invalid token'}));
 await assert.rejects(()=>new TikTokClient({appId:'fake',appSecret:'fake',accessToken:'fake'}).getAdAccounts(),/Invalid token/);
});
test("Snapchat unwraps campaigns and converts micro-currency stats",async t=>{
 mockFetch(t,async(input,init)=>{
  const url=new URL(String(input));assert.notEqual(init?.method,'POST');
  if(url.pathname.endsWith('/campaigns')){assert.equal(url.pathname,'/v1/adaccounts/account/campaigns');return response({request_status:'SUCCESS',campaigns:[{campaign:{id:'c1',name:'Discovery',status:'ACTIVE'}}]});}
  assert.equal(url.searchParams.get('end_time'),'2026-10-15T00:00:00.000Z');
  return response({request_status:'SUCCESS',timeseries_stats:[{timeseries_stat:{timeseries:[{stats:{spend:12500000,impressions:200,swipes:5,conversion_purchases:2,conversion_purchases_value:60000000}}]}}]});
 });
 const client=new SnapchatClient({clientId:'fake',clientSecret:'fake',accessToken:'fake'});
 assert.equal((await client.getCampaigns('account'))[0].id,'c1');
 const stats=await client.getStats('campaign','c1','2026-10-14','2026-10-14');assert.equal(stats.spend,12.5);assert.equal(stats.revenue,60);assert.equal(stats.conversions,2);
});
test("Meta sends JSON date ranges and reads purchase values without conversion assumptions",async t=>{
 mockFetch(t,async input=>{
  const url=new URL(String(input));assert.deepEqual(JSON.parse(url.searchParams.get('time_range')||'{}'),{since:'2026-10-14',until:'2026-10-14'});
  assert.ok(url.searchParams.get('fields')?.includes('action_values'));
  return response({data:[{spend:'15',impressions:'200',clicks:'20',actions:[{action_type:'offsite_conversion.fb_pixel_purchase',value:'2'}],action_values:[{action_type:'offsite_conversion.fb_pixel_purchase',value:'72'}]}]});
 });
 const row=(await new MetaClient({accessToken:'fake'}).getInsights('campaign','c1','2026-10-14','2026-10-14'))[0];assert.equal(MetaClient.getConversionValue(row),72);assert.equal(MetaClient.getConversionCount(row),2);
});
test("Shopify imports every page and rejects arbitrary hosts",async t=>{
 let pages=0;mockFetch(t,async input=>{const url=new URL(String(input));assert.equal(url.hostname,'test-store.myshopify.com');pages++;return response({orders:pages===1?[{id:1},{id:2}]:[{id:3}]});});
 const orders=await new ShopifyClient({storeDomain:'test-store.myshopify.com',accessToken:'fake'}).getOrders({limit:2,status:'any'});assert.equal(orders.length,3);assert.equal(pages,2);
 assert.throws(()=>new ShopifyClient({storeDomain:'localhost',accessToken:'fake'}));
});
