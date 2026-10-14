"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Percent, type LucideIcon } from "lucide-react";

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
  currency?: string;
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
  currency = "USD",
}: {
  label: string;
  value: number;
  previous?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: LucideIcon;
  invertColor?: boolean;
  currency?: string;
}) {
  const change = previous !== undefined && previous !== 0 ? ((value - previous) / previous) * 100 : 0;
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
        {prefix === "$" ? new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value) : `${prefix}${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`}
        {suffix}
      </div>
    </div>
  );
}

export function ProfitMetricsCard({ metrics, previousMetrics, currency = "USD" }: ProfitMetricsCardProps) {
  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          currency={currency}
          label="Revenue"
          value={metrics.revenue}
          previous={previousMetrics?.revenue}
          icon={DollarSign}
        />
        <MetricCard
          currency={currency}
          label="Net Profit"
          value={metrics.netProfit}
          previous={previousMetrics?.netProfit}
          icon={TrendingUp}
          invertColor
        />
        <MetricCard
          currency={currency}
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
          currency={currency}
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
          currency={currency}
              label="COGS"
              value={metrics.cogs}
              previous={previousMetrics?.cogs}
            />
            <MetricCard
          currency={currency}
              label="Ad Spend"
              value={metrics.adSpend}
              previous={previousMetrics?.adSpend}
            />
            <MetricCard
          currency={currency}
              label="Transaction Fees"
              value={metrics.transactionFees}
              previous={previousMetrics?.transactionFees}
            />
            <MetricCard
          currency={currency}
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
          currency={currency}
              label="ROI"
              value={metrics.roi}
              previous={previousMetrics?.roi}
              prefix=""
              suffix="%"
              decimals={1}
              invertColor
            />
            <MetricCard
          currency={currency}
              label="ROAS"
              value={metrics.roas}
              previous={previousMetrics?.roas}
              decimals={2}
            />
            <MetricCard
          currency={currency}
              label="AOV"
              value={metrics.aov}
              previous={previousMetrics?.aov}
              decimals={2}
            />
            <MetricCard
          currency={currency}
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
