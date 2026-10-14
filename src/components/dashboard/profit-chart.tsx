"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

type MetricKey = "revenue" | "netProfit" | "adSpend" | "totalCost";
const metricConfig: Record<MetricKey, { label: string; color: string }> = {
  revenue: { label: "Revenue", color: "bg-emerald-500" },
  netProfit: { label: "Net Profit", color: "bg-blue-500" },
  adSpend: { label: "Ad Spend", color: "bg-rose-500" },
  totalCost: { label: "Total Cost", color: "bg-amber-500" },
};
const PLOT_HEIGHT = 240;
const shortDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function ProfitChart({ data, currency = "USD" }: { data: DailyProfitData[]; currency?: string }) {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 });
  const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("netProfit");
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const config = metricConfig[selectedMetric];

  if (!data?.length) {
    return <Card><CardHeader><CardTitle>Profit Over Time</CardTitle></CardHeader><CardContent><p className="py-16 text-center text-sm text-muted-foreground">No data available for the selected period</p></CardContent></Card>;
  }

  // Include zero in the scale so bar height represents the actual amount.
  // Negative profit extends below the same baseline, rather than overlapping it.
  const values = data.map((day) => day.metrics[selectedMetric]);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const roughStep = (max - min || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 5, 10].find((multiple) => multiple * magnitude >= roughStep) ?? 10) * magnitude;
  const lower = Math.floor(min / step) * step;
  const upper = Math.ceil(max / step) * step || (min < 0 ? 0 : step * 4);
  const range = upper - lower;
  const toY = (value: number) => (upper - value) / range * PLOT_HEIGHT;
  const baseline = toY(0);
  const ticks = Array.from({ length: Math.round(range / step) + 1 }, (_, index) => upper - index * step);
  const active = data.find((day) => day.date === activeDate);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>Profit Over Time</CardTitle>
          <div role="group" aria-label="Chart metric" className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:flex sm:w-auto">
            {(Object.entries(metricConfig) as [MetricKey, typeof config][]).map(([key, metric]) => (
              <button key={key} type="button" aria-pressed={selectedMetric === key} onClick={() => { setSelectedMetric(key); setActiveDate(null); }} className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${selectedMetric === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60"}`}>{metric.label}</button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <figure aria-label={`${config.label} over time`} className="min-w-0 space-y-3">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{config.label} for this period</span>
            <span className="text-lg font-semibold tabular-nums">{money.format(total)}</span>
          </figcaption>
          <p className="min-h-8 text-xs leading-5 text-muted-foreground" aria-live="polite">
            {active ? `${shortDate(active.date)} · ${config.label}: ${money.format(active.metrics[selectedMetric])}` : "Hover, tap, or focus a bar to see its value."}
          </p>
          <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2">
            <div aria-hidden="true" className="relative text-right text-xs tabular-nums text-muted-foreground" style={{ height: PLOT_HEIGHT }}>
              {ticks.map((tick, index) => <span key={tick} className="absolute right-0 leading-none" style={{ top: toY(tick), transform: index === 0 ? "none" : index === ticks.length - 1 ? "translateY(-100%)" : "translateY(-50%)" }}>{compactMoney.format(tick)}</span>)}
            </div>
            <div className="relative min-w-0" style={{ height: PLOT_HEIGHT }}>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {ticks.map((tick) => <div key={tick} className={`absolute left-0 right-0 border-t ${tick === 0 ? "border-border" : "border-dashed border-border/60"}`} style={{ top: toY(tick) }} />)}
              </div>
              <div className="absolute inset-0 flex gap-0.5 sm:gap-1" onMouseLeave={() => setActiveDate(null)}>
                {data.map((day) => {
                  const value = day.metrics[selectedMetric];
                  const height = Math.abs(toY(value) - baseline);
                  return (
                    <button key={day.date} type="button" aria-label={`${shortDate(day.date)}, ${config.label}: ${money.format(value)}`} onMouseEnter={() => setActiveDate(day.date)} onFocus={() => setActiveDate(day.date)} onBlur={() => setActiveDate(null)} onClick={() => setActiveDate(day.date)} className="relative h-full min-w-0 flex-1 rounded-sm focus-visible:z-10 focus-visible:outline-offset-1">
                      <span className={`absolute inset-x-0 rounded-sm transition-opacity ${value < 0 ? "bg-red-500" : config.color} ${activeDate && activeDate !== day.date ? "opacity-60" : "opacity-100"}`} style={{ top: Math.min(toY(value), baseline), height }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div />
            <div aria-hidden="true" className="mt-3 flex justify-between gap-2 text-xs text-muted-foreground">
              <span>{shortDate(data[0].date)}</span>
              {data.length > 2 && <span>{shortDate(data[Math.floor(data.length / 2)].date)}</span>}
              {data.length > 1 && <span>{shortDate(data[data.length - 1].date)}</span>}
            </div>
          </div>
        </figure>
      </CardContent>
    </Card>
  );
}
