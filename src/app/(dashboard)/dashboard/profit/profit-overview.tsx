"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetchJSON } from "@/lib/utils/fetch-json";
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
  currency?: string;
  startDate: string;
  endDate: string;
  granularity: string;
}

export function ProfitOverview({ brandId, startDate, endDate, granularity, currency = "USD" }: ProfitOverviewProps) {
  const formatMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  const [dateRange, setDateRange] = useState({ startDate, endDate });
  const [granularityValue, setGranularityValue] = useState(granularity);
  const params = new URLSearchParams({ ...dateRange, granularity: granularityValue, includeBreakdown: "true" });
  const { data: response, error, isLoading: loading, mutate } = useSWR<{
    data: ProfitMetrics | DailyProfitData[];
    breakdown?: Record<string, { spend: number; revenue: number; roas: number }>;
  }>(`/api/brands/${brandId}/profit?${params}`, fetchJSON);
  const data = {
    metrics: response && !Array.isArray(response.data) ? response.data : undefined,
    chartData: response && Array.isArray(response.data) ? response.data : undefined,
    breakdown: response?.breakdown,
  };

  function handlePreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setDateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
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

        <div className="flex flex-wrap items-center gap-2">
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
          <SelectTrigger aria-label="Profit granularity" className="w-[140px]">
            <SelectValue placeholder="Granularity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem itemValue="daily">Daily</SelectItem>
            <SelectItem itemValue="weekly">Weekly</SelectItem>
            <SelectItem itemValue="monthly">Monthly</SelectItem>
            <SelectItem itemValue="overall">Overall</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading profit report…</p>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}<Button onClick={() => mutate()} variant="outline" size="sm" className="ml-3">Retry</Button></div>}
      {/* Content */}
      {data.metrics && (
        <ProfitMetricsCard metrics={data.metrics} currency={currency} />
      )}

      {data.chartData && data.chartData.length > 0 && (
        <>
          <ProfitChart data={data.chartData} currency={currency} />

          {/* Summary metrics for period */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-2xl font-semibold mt-1">
                {formatMoney(data.chartData.reduce((sum, d) => sum + d.metrics.revenue, 0))}
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Net Profit</div>
              <div className="text-2xl font-semibold mt-1">
                {formatMoney(data.chartData.reduce((sum, d) => sum + d.metrics.netProfit, 0))}
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Ad Spend</div>
              <div className="text-2xl font-semibold mt-1">
                {formatMoney(data.chartData.reduce((sum, d) => sum + d.metrics.adSpend, 0))}
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-sm text-muted-foreground">Orders</div>
              <div className="text-2xl font-semibold mt-1">
                {data.chartData.reduce((sum, d) => sum + (d.metrics.orders || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}

      {data.breakdown && (
        <PlatformBreakdown breakdown={data.breakdown} currency={currency} />
      )}
    </div>
  );
}
