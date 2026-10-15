"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetchJSON } from "@/lib/utils/fetch-json";
import type { Anomaly, Insight, Recommendation } from "@/lib/ai/analysis";
import type { TrendData } from "@/components/ai/trend-analysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, RefreshCw } from "lucide-react";
import { AnomalyList } from "@/components/ai/anomaly-list";
import { InsightsList } from "@/components/ai/insights-list";
import { RecommendationsList } from "@/components/ai/recommendations-list";
import { TrendAnalysis } from "@/components/ai/trend-analysis";

interface AIInsightsProps {
  brandId: string;
  currency?: string;
  startDate: string;
  endDate: string;
}

export function AIInsights({ brandId, startDate, endDate, currency = "USD" }: AIInsightsProps) {
  const [dateRange, setDateRange] = useState({ startDate, endDate });
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { data: response, error, isLoading: loading, isValidating: refreshing, mutate } = useSWR<{
    anomalies?: Anomaly[]; insights?: Insight[]; recommendations?: Recommendation[]; trends?: TrendData;
    analysisMethod?: string; configurationMessage?: string;
  }>(`/api/brands/${brandId}/ai?${new URLSearchParams(dateRange)}`, fetchJSON, { revalidateOnFocus: false, dedupingInterval: 60000 });
  const data = response ?? {};
  const handleRefresh = () => mutate();

  function handlePreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    setDateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  }

  function handleRecommendationAction(id: string, action: "approve" | "decline") {
    if (action === "decline") setDismissed((previous) => [...previous, id]);
  }

  return (
    <div className="space-y-6">
      {data.configurationMessage && <p role="status" className="rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">{data.configurationMessage}</p>}
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Period:</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePreset(7)}>
            7 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset(30)}>
            30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePreset(90)}>
            90 Days
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Start date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="w-auto"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="End date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="w-auto"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading analysis…</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}
      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Anomalies */}
        <AnomalyList anomalies={data.anomalies || []} />

        {/* Trend Analysis */}
        {data.trends && <TrendAnalysis currency={currency} trend={data.trends} />}
      </div>

      {/* Insights */}
      {data.insights && <InsightsList insights={data.insights} />}

      {/* Recommendations */}
      {data.recommendations && (
        <RecommendationsList
          currency={currency}
          recommendations={data.recommendations.filter((item) => !dismissed.includes(item.id))}
          onAction={handleRecommendationAction}
        />
      )}
    </div>
  );
}
