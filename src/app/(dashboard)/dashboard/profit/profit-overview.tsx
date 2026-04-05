"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfitMetricsCard, type ProfitMetrics } from "@/components/dashboard/profit-metrics-card";
import { ProfitChart, type DailyProfitData } from "@/components/dashboard/profit-chart";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";
import { Loader2, Calendar } from "lucide-react";

interface ProfitOverviewProps {
  brandId: string;
  startDate: string;
  endDate: string;
  granularity: string;
}

export function ProfitOverview({ brandId, startDate, endDate, granularity }: ProfitOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    metrics?: ProfitMetrics;
    chartData?: DailyProfitData[];
    breakdown?: Record<string, { spend: number; revenue: number; roas: number }>;
  }>({});
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [dateRange, setDateRange] = useState({ startDate, endDate });
  const [granularityValue, setGranularityValue] = useState(granularity);

  useEffect(() => {
    fetchData();
  }, [brandId, dateRange, granularityValue]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        granularity: granularityValue,
        includeBreakdown: "true",
      });

      const response = await fetch(`/api/brands/${brandId}/profit?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch profit data");
      }

      setData({
        metrics: granularityValue === "overall" ? result.data as ProfitMetrics : undefined,
        chartData: granularityValue !== "overall" ? result.data as DailyProfitData[] : undefined,
        breakdown: result.breakdown,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profit data");
    } finally {
      setLoading(false);
    }
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
      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Period:</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset(7)}
          >
            7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset(30)}
          >
            30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePreset(90)}
          >
            90 Days
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div>
            <Label htmlFor="startDate" className="sr-only">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-auto"
            />
          </div>
          <span className="text-muted-foreground">to</span>
          <div>
            <Label htmlFor="endDate" className="sr-only">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-auto"
            />
          </div>
        </div>

        <Select value={granularityValue} onValueChange={setGranularityValue}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Granularity" value={granularityValue} />
          </SelectTrigger>
          <SelectContent value={granularityValue} onValueChange={setGranularityValue}>
            <SelectItem itemValue="daily">Daily</SelectItem>
            <SelectItem itemValue="weekly">Weekly</SelectItem>
            <SelectItem itemValue="monthly">Monthly</SelectItem>
            <SelectItem itemValue="overall">Overall</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {data.metrics && (
        <ProfitMetricsCard metrics={data.metrics} />
      )}

      {data.chartData && data.chartData.length > 0 && (
        <>
          <ProfitChart data={data.chartData} />

          {/* Summary metrics for period */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-2xl font-semibold mt-1">
                ${data.chartData.reduce((sum, d) => sum + d.metrics.revenue, 0).toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Net Profit</div>
              <div className="text-2xl font-semibold mt-1">
                ${data.chartData.reduce((sum, d) => sum + d.metrics.netProfit, 0).toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Ad Spend</div>
              <div className="text-2xl font-semibold mt-1">
                ${data.chartData.reduce((sum, d) => sum + d.metrics.adSpend, 0).toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Orders</div>
              <div className="text-2xl font-semibold mt-1">
                {data.chartData.reduce((sum, d) => sum + (d.metrics.orders || 0), 0)}
              </div>
            </div>
          </div>
        </>
      )}

      {data.breakdown && (
        <PlatformBreakdown breakdown={data.breakdown} />
      )}
    </div>
  );
}
