"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, RefreshCw } from "lucide-react";
import { AnomalyList } from "@/components/ai/anomaly-list";
import { InsightsList } from "@/components/ai/insights-list";
import { RecommendationsList } from "@/components/ai/recommendations-list";
import { TrendAnalysis } from "@/components/ai/trend-analysis";

interface AIInsightsProps {
  brandId: string;
  startDate: string;
  endDate: string;
}

export function AIInsights({ brandId, startDate, endDate }: AIInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    anomalies?: any[];
    insights?: any[];
    recommendations?: any[];
    trends?: any;
  }>({});
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [dateRange, setDateRange] = useState({ startDate, endDate });

  useEffect(() => {
    fetchData();
  }, [brandId, dateRange]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await fetch(`/api/brands/${brandId}/ai?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch AI insights");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch AI insights");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function handlePreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setDateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
  }

  function handleRecommendationAction(id: string, action: "approve" | "decline") {
    // For now, just remove the recommendation from the list
    if (action === "decline" && data.recommendations) {
      setData({
        ...data,
        recommendations: data.recommendations.filter((r: any) => r.id !== id),
      });
    } else if (action === "approve") {
      alert(`Recommendation "${id}" approved. Integration with ad platforms coming soon!`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchData} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="w-auto"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
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

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Anomalies */}
        <AnomalyList anomalies={data.anomalies || []} />

        {/* Trend Analysis */}
        {data.trends && <TrendAnalysis trend={data.trends} />}
      </div>

      {/* Insights */}
      {data.insights && <InsightsList insights={data.insights} />}

      {/* Recommendations */}
      {data.recommendations && (
        <RecommendationsList
          recommendations={data.recommendations}
          onAction={handleRecommendationAction}
        />
      )}
    </div>
  );
}
