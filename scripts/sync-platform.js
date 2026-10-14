#!/usr/bin/env node
const platform = process.argv[2];
if (!["all", "shopify", "meta", "google", "snapchat", "tiktok"].includes(platform)) throw new Error("Usage: node --env-file=.env.local scripts/sync-platform.js [all|shopify|meta|google|snapchat|tiktok]");
if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET is required");
const url = new URL("/api/cron/sync-platforms", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
if (platform !== "all") url.searchParams.set("platform", platform);
fetch(url, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }).then(async (response) => {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Sync completed with errors");
  console.log(`Processed ${result.processed} connections; failed ${result.failed}.`);
}).catch((error) => { console.error(error.message); process.exitCode = 1; });
