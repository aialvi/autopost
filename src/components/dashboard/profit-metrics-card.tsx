"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Percent } from "lucide-react";

export interface ProfitMetrics {
  revenue: number;
  cogs: number;
  transactionFees: number;
  adSpend: number;
  customExpenses: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  roi: number;
  roas: number;
  aov: number;
  profitMargin: number;
  orders: number;
}

interface ProfitMetricsCardProps {
  metrics: ProfitMetrics;
  previousMetrics?: ProfitMetrics;
}

function MetricCard({
  label,
  value,
  previous,
  prefix = "$",
  suffix = "",
  decimals = 2,
  icon: Icon,
  invertColor = false,
}: {
  label: string;
  value: number;
  previous?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: any;
  invertColor?: boolean;
}) {
  const change = previous !== undefined ? ((value - previous) / previous) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        {previous !== undefined && change !== 0 && (
          <div className={`flex items-center text-xs ${
            (isPositive && !invertColor) || (!isPositive && invertColor)
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold">
        {prefix}
        {value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        {suffix}
      </div>
    </div>
  );
}

export function ProfitMetricsCard({ metrics, previousMetrics }: ProfitMetricsCardProps) {
  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={metrics.revenue}
          previous={previousMetrics?.revenue}
          icon={DollarSign}
        />
        <MetricCard
          label="Net Profit"
          value={metrics.netProfit}
          previous={previousMetrics?.netProfit}
          icon={TrendingUp}
          invertColor
        />
        <MetricCard
          label="Profit Margin"
          value={metrics.profitMargin}
          previous={previousMetrics?.profitMargin}
          prefix=""
          suffix="%"
          decimals={1}
          icon={Percent}
          invertColor
        />
        <MetricCard
          label="Orders"
          value={metrics.orders}
          previous={previousMetrics?.orders}
          prefix=""
          decimals={0}
          icon={ShoppingCart}
        />
      </div>

      {/* Secondary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="COGS"
              value={metrics.cogs}
              previous={previousMetrics?.cogs}
            />
            <MetricCard
              label="Ad Spend"
              value={metrics.adSpend}
              previous={previousMetrics?.adSpend}
            />
            <MetricCard
              label="Transaction Fees"
              value={metrics.transactionFees}
              previous={previousMetrics?.transactionFees}
            />
            <MetricCard
              label="Custom Expenses"
              value={metrics.customExpenses}
              previous={previousMetrics?.customExpenses}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="ROI"
              value={metrics.roi}
              previous={previousMetrics?.roi}
              prefix=""
              suffix="%"
              decimals={1}
              invertColor
            />
            <MetricCard
              label="ROAS"
              value={metrics.roas}
              previous={previousMetrics?.roas}
              decimals={2}
            />
            <MetricCard
              label="AOV"
              value={metrics.aov}
              previous={previousMetrics?.aov}
              decimals={2}
            />
            <MetricCard
              label="Gross Profit"
              value={metrics.grossProfit}
              previous={previousMetrics?.grossProfit}
              invertColor
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
