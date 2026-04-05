"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface BrandComparison {
  brandId: string;
  brandName: string;
  metrics: {
    revenue: number;
    netProfit: number;
    adSpend: number;
    roas: number;
    profitMargin: number;
    orders: number;
  };
}

interface MultiBrandComparisonProps {
  comparisons: BrandComparison[];
}

export function MultiBrandComparison({ comparisons }: MultiBrandComparisonProps) {
  if (!comparisons || comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Select multiple brands to compare performance
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find best and worst performers for each metric
  const maxRevenue = Math.max(...comparisons.map((c) => c.metrics.revenue));
  const maxProfit = Math.max(...comparisons.map((c) => c.metrics.netProfit));
  const maxROAS = Math.max(...comparisons.map((c) => c.metrics.roas));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Brand</th>
                <th className="text-right p-3 font-medium">Revenue</th>
                <th className="text-right p-3 font-medium">Net Profit</th>
                <th className="text-right p-3 font-medium">Ad Spend</th>
                <th className="text-right p-3 font-medium">ROAS</th>
                <th className="text-right p-3 font-medium">Margin</th>
                <th className="text-right p-3 font-medium">Orders</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((brand) => (
                <tr key={brand.brandId} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{brand.brandName}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      ${brand.metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      {brand.metrics.revenue === maxRevenue && maxRevenue > 0 && (
                        <Badge variant="default" className="text-xs">Best</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      ${brand.metrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      {brand.metrics.netProfit === maxProfit && maxProfit > 0 && (
                        <Badge variant="default" className="text-xs">Best</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    ${brand.metrics.adSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {brand.metrics.roas.toFixed(2)}x
                      {brand.metrics.roas === maxROAS && maxROAS > 0 && (
                        <Badge variant="default" className="text-xs">Best</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className={`flex items-center justify-end gap-2 ${
                      brand.metrics.profitMargin >= 20 ? "text-green-600" :
                      brand.metrics.profitMargin >= 10 ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {brand.metrics.profitMargin.toFixed(1)}%
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {brand.metrics.orders.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-xl font-semibold mt-1">
              ${comparisons.reduce((sum, c) => sum + c.metrics.revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Profit</div>
            <div className="text-xl font-semibold mt-1">
              ${comparisons.reduce((sum, c) => sum + c.metrics.netProfit, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Avg ROAS</div>
            <div className="text-xl font-semibold mt-1">
              {(comparisons.reduce((sum, c) => sum + c.metrics.roas, 0) / comparisons.length).toFixed(2)}x
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-xl font-semibold mt-1">
              {comparisons.reduce((sum, c) => sum + c.metrics.orders, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
