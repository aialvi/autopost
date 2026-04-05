#!/usr/bin/env node

/**
 * Platform Sync Script
 * Syncs data from external ad platforms for all active connections
 *
 * Usage: node scripts/sync-platform.js [platform]
 *
 * Platforms: meta, shopify, google, snapchat, tiktok, all
 */

const { db } = require("@/lib/db");
const { platformConnections } = require("@/lib/db/schema");
const { eq } = require("drizzle-orm");

const PLATFORMS = ["meta", "shopify", "google", "snapchat", "tiktok"];

async function syncPlatform(platform) {
  console.log(`🔄 Syncing ${platform.toUpperCase()}...`);

  try {
    // Get all active connections for this platform
    const connections = await db.query.platformConnections.findMany({
      where: eq(platformConnections.platform, platform),
    });

    if (connections.length === 0) {
      console.log(`   No active ${platform} connections found`);
      return;
    }

    // Sync each connection
    for (const connection of connections) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/brands/${connection.brandId}/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({ platform }),
          }
        );

        if (response.ok) {
          console.log(`   ✅ Synced brand ${connection.brandId}`);
        } else {
          console.error(`   ❌ Failed to sync brand ${connection.brandId}`);
        }
      } catch (error) {
        console.error(`   ❌ Error syncing brand ${connection.brandId}:`, error.message);
      }
    }

    console.log(`✅ ${platform.toUpperCase()} sync complete`);
  } catch (error) {
    console.error(`❌ Error syncing ${platform}:`, error);
    process.exit(1);
  }
}

async function main() {
  const platform = process.argv[2]?.toLowerCase();

  if (!platform) {
    console.error("Usage: node scripts/sync-platform.js [platform]");
    console.error("Platforms: all, meta, shopify, google, snapchat, tiktok");
    process.exit(1);
  }

  if (platform === "all") {
    console.log("🔄 Syncing all platforms...");
    for (const p of PLATFORMS) {
      await syncPlatform(p);
    }
    console.log("✅ All platforms synced");
  } else if (PLATFORMS.includes(platform)) {
    await syncPlatform(platform);
  } else {
    console.error(`Unknown platform: ${platform}`);
    console.error(`Available platforms: ${PLATFORMS.join(", ")}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
