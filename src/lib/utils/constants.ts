// ── Ad Platforms (only these count as ad spend) ─────────────
export const AD_PLATFORMS = ["meta", "snapchat", "google", "tiktok"] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

// ── All Platforms ───────────────────────────────────────────
export const ALL_PLATFORMS = ["shopify", ...AD_PLATFORMS] as const;
export type Platform = (typeof ALL_PLATFORMS)[number];

// ── Subscription Tiers ──────────────────────────────────────
export const SUBSCRIPTION_TIERS = ["starter", "growth", "enterprise"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const TIER_LIMITS: Record<
  SubscriptionTier,
  {
    maxStores: number;
    maxTeamMembers: number;
    maxBrands: number;
    aiAnalysis: boolean;
    telegramReports: boolean;
    capiEnabled: boolean;
  }
> = {
  starter: {
    maxStores: 1,
    maxTeamMembers: 2,
    maxBrands: 1,
    aiAnalysis: false,
    telegramReports: false,
    capiEnabled: false,
  },
  growth: {
    maxStores: 3,
    maxTeamMembers: 5,
    maxBrands: 3,
    aiAnalysis: true,
    telegramReports: true,
    capiEnabled: true,
  },
  enterprise: {
    maxStores: Infinity,
    maxTeamMembers: Infinity,
    maxBrands: Infinity,
    aiAnalysis: true,
    telegramReports: true,
    capiEnabled: true,
  },
};

// ── Transaction Fee Rates ───────────────────────────────────
export const TRANSACTION_FEES: Record<
  string,
  { percentage: number; fixed: number }
> = {
  shopify_payments: { percentage: 0.029, fixed: 0.3 },
  paypal: { percentage: 0.0349, fixed: 0.49 },
  stripe: { percentage: 0.029, fixed: 0.3 },
  default: { percentage: 0.029, fixed: 0.3 },
};

// ── Brand User Roles ────────────────────────────────────────
export const BRAND_ROLES = ["owner", "manager", "viewer"] as const;
export type BrandRole = (typeof BRAND_ROLES)[number];

// ── AI Recommendation Actions ───────────────────────────────
export const RECOMMENDATION_ACTIONS = [
  "kill",
  "scale",
  "watch",
  "launch",
] as const;
export type RecommendationAction = (typeof RECOMMENDATION_ACTIONS)[number];

// ── Time Range Presets ──────────────────────────────────────
export const TIME_RANGES = ["7d", "14d", "30d", "90d", "custom"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];
