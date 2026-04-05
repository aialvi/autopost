"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface DailyProfitData {
  date: string;
  metrics: {
    revenue: number;
    netProfit: number;
    adSpend: number;
    totalCost: number;
    orders?: number;
  };
}

interface ProfitChartProps {
  data: DailyProfitData[];
}

type MetricKey = "revenue" | "netProfit" | "adSpend" | "totalCost";

const metricConfig: Record<MetricKey, { label: string; color: string }> = {
  revenue: { label: "Revenue", color: "bg-green-500" },
  netProfit: { label: "Net Profit", color: "bg-blue-500" },
  adSpend: { label: "Ad Spend", color: "bg-red-500" },
  totalCost: { label: "Total Cost", color: "bg-orange-500" },
};

export function ProfitChart({ data }: ProfitChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("netProfit");

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => d.metrics[selectedMetric])
  );
  const minValue = Math.min(
    ...data.map((d) => d.metrics[selectedMetric])
  );

  // Format value for display
  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Calculate bar heights
  const getBarHeight = (value: number) => {
    if (maxValue === minValue) return 50;
    const range = maxValue - minValue;
    const normalized = (value - minValue) / range;
    return Math.max(5, normalized * 100);
  };

  const getBarY = (value: number) => {
    if (maxValue === minValue) return 50;
    const range = maxValue - minValue;
    const normalized = (value - minValue) / range;
    return 100 - Math.max(0, normalized * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Profit Over Time</CardTitle>
          <Tabs value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
            <TabsList>
              <TabsTrigger value="revenue" currentValue={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>Revenue</TabsTrigger>
              <TabsTrigger value="netProfit" currentValue={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>Net Profit</TabsTrigger>
              <TabsTrigger value="adSpend" currentValue={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>Ad Spend</TabsTrigger>
              <TabsTrigger value="totalCost" currentValue={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>Total Cost</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {metricConfig[selectedMetric].label}
            </span>
            <span className="font-semibold">
              {formatValue(data.reduce((sum, d) => sum + d.metrics[selectedMetric], 0))}
            </span>
          </div>

          {/* Chart */}
          <div className="relative h-64">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              <div className="border-b border-dashed border-border/50" />
              <div className="border-b border-dashed border-border/50" />
              <div className="border-b border-dashed border-border/50" />
              <div className="border-b border-dashed border-border/50" />
              <div />
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 -ml-8 flex flex-col justify-between text-xs text-muted-foreground">
              <span>{formatValue(maxValue)}</span>
              <span>{formatValue((maxValue + minValue) / 2)}</span>
              <span>{formatValue(minValue)}</span>
            </div>

            {/* Bars */}
            <div className="absolute inset-0 flex items-end justify-between gap-1 pl-8">
              {data.map((d, i) => {
                const value = d.metrics[selectedMetric];
                const height = getBarHeight(value);
                const isNegative = value < 0;

                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-popover border rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                      <div className="font-medium">{d.date}</div>
                      <div>
                        {metricConfig[selectedMetric].label}: {formatValue(value)}
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      className="w-full rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        backgroundColor: isNegative ? "rgb(239 68 68)" : undefined,
                      }}
                    >
                      <div
                        className={`w-full h-full ${metricConfig[selectedMetric].color} rounded-t`}
                        style={{ opacity: isNegative ? 1 : undefined }}
                      />
                    </div>

                    {/* X-axis label for first, middle, last */}
                    {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
                      <div className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                        {new Date(d.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zero line if there are negative values */}
            {minValue < 0 && (
              <div
                className="absolute left-8 right-0 border-t border-red-500/50"
                style={{
                  top: `${getBarY(0)}%`,
                }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
