import test from "node:test";
import assert from "node:assert/strict";
import { enhanceRecommendations } from "../src/lib/ai/provider";
import { calculateMetrics } from "../src/lib/profit/metrics";
const metrics=calculateMetrics({revenue:1000,cogs:300,transactionFees:30,adSpend:200,customExpenses:20,orders:10});
test("AI reports missing configuration honestly and does not call a provider",async()=>{
 const key=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 try { const result=await enhanceRecommendations(metrics,[]);assert.equal(result.analysisMethod,"rules");assert.ok(result.configurationMessage?.includes("not been configured")); }finally{if(key)process.env.GEMINI_API_KEY=key;}
});
test("AI validates provider responses and falls back on malformed recommendations",async()=>{
 const previous=globalThis.fetch;process.env.GEMINI_API_KEY="test-only";
 try {
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({recommendations:[{title:"Watch search",reasoning:"Wait for more data",actionType:"watch",currentMetrics:{spend:200,roas:5},recommendedChanges:{action:"resume"}}]})}]}}]}));
  const good=await enhanceRecommendations(metrics,[]);assert.equal(good.analysisMethod,"gemini");assert.equal(good.recommendations[0].title,"Watch search");
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"recommendations":[{"actionType":"spend-everything"}]}'}]}}]}));
  const bad=await enhanceRecommendations(metrics,[]);assert.equal(bad.analysisMethod,"rules");assert.ok(bad.configurationMessage?.includes("invalid response"));
 }finally{globalThis.fetch=previous;delete process.env.GEMINI_API_KEY;}
});
