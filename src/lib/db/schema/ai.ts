import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./core";

export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    analysisType: text("analysis_type", {
      enum: ["performance_review", "trend_analysis", "daily_report"],
    }).notNull(),
    modelUsed: text("model_used").notNull(),
    prompt: text("prompt").notNull(),
    response: text("response").notNull(),
    tokenUsage: jsonb("token_usage").$type<{
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }>(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_analysis_brand_idx").on(table.brandId),
    index("ai_analysis_type_idx").on(table.analysisType),
  ]
);

export const aiAnalysesRelations = relations(aiAnalyses, ({ many }) => ({
  recommendations: many(aiRecommendations),
}));

export const aiRecommendations = pgTable(
  "ai_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => aiAnalyses.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    adId: uuid("ad_id"),
    campaignId: uuid("campaign_id"),
    actionType: text("action_type", {
      enum: ["kill", "scale", "watch", "launch"],
    }).notNull(),
    currentMetrics: jsonb("current_metrics").$type<{
      spend?: number;
      impressions?: number;
      clicks?: number;
      conversions?: number;
      roas?: number;
      ctr?: number;
    }>(),
    recommendedChanges: jsonb("recommended_changes").$type<{
      budget?: number;
      action: "increase" | "decrease" | "pause" | "resume";
      targetValue?: number;
    }>(),
    reasoning: text("reasoning").notNull(),
    status: text("status", {
      enum: ["pending", "approved", "declined", "executed", "failed"],
    }).notNull()
      .default("pending"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    executedAt: timestamp("executed_at", { mode: "date" }),
    executionResult: jsonb("execution_result").$type<{
      success: boolean;
      error?: string;
    }>(),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_recommendation_analysis_idx").on(table.analysisId),
    index("ai_recommendation_brand_idx").on(table.brandId),
    index("ai_recommendation_ad_idx").on(table.adId),
    index("ai_recommendation_status_idx").on(table.status),
  ]
);

export const aiRecommendationsRelations = relations(aiRecommendations, ({
  one,
}) => ({
  analysis: one(aiAnalyses, {
    fields: [aiRecommendations.analysisId],
    references: [aiAnalyses.id],
  }),
  brand: one(brands, {
    fields: [aiRecommendations.brandId],
    references: [brands.id],
  }),
}));
