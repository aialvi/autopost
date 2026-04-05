import { relations } from "drizzle-orm";
import { brands } from "./core";
import { platformConnections } from "./platforms";
import { shopifyProducts, shopifyOrders } from "./shopify";
import { adCampaigns, adDataSnapshots } from "./ads";
import { customExpenses } from "./financial";
import { aiAnalyses } from "./ai";
import { pixelEvents, capiEvents } from "./attribution";
import { syncLogs, telegramConfigs } from "./system";

// Extend brands relations with all related tables
export const brandsRelationsExtended = relations(brands, ({ many }) => ({
  brandUsers: many(brandUsers),
  platformConnections: many(platformConnections),
  shopifyProducts: many(shopifyProducts),
  shopifyOrders: many(shopifyOrders),
  adCampaigns: many(adCampaigns),
  adDataSnapshots: many(adDataSnapshots),
  customExpenses: many(customExpenses),
  aiAnalyses: many(aiAnalyses),
  pixelEvents: many(pixelEvents),
  capiEvents: many(capiEvents),
  syncLogs: many(syncLogs),
  telegramConfigs: many(telegramConfigs),
}));

// Import brandUsers for the relation
import { brandUsers } from "./core";
