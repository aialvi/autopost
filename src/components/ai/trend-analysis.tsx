"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

export interface TrendData {
  trend: "growing" | "stable" | "declining";
  growthRate: number;
  forecast: Array<{
    date: string;
    projected: number;
    confidence: "high" | "medium" | "low";
  }>;
}

interface TrendAnalysisProps {
  trend: TrendData;
}

const trendConfig = {
  growing: {
    icon: TrendingUp,
    label: "Growing",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900",
  },
  stable: {
    icon: Minus,
    label: "Stable",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900",
  },
  declining: {
    icon: TrendingDown,
    label: "Declining",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900",
  },
};

const confidenceColors = {
  high: "bg-green-500",
  medium: "bg-yellow-500",
  low: "bg-orange-500",
};

export function TrendAnalysis({ trend }: TrendAnalysisProps) {
  const config = trendConfig[trend.trend];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Trend */}
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${config.bgColor} ${config.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Current Trend</div>
              <div className="text-2xl font-semibold capitalize">{trend.trend}</div>
              <div className={`text-sm ${trend.growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend.growthRate >= 0 ? "+" : ""}
                {trend.growthRate.toFixed(1)}% growth rate
              </div>
            </div>
          </div>

          {/* Forecast */}
          {trend.forecast && trend.forecast.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                <span>7-Day Forecast</span>
              </div>
              <div className="space-y-2">
                {trend.forecast.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium w-24">
                          ${day.projected.toFixed(2)}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${confidenceColors[day.confidence]}`}
                            style={{
                              width: day.confidence === "high" ? "80%" : day.confidence === "medium" ? "50%" : "25%",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {day.confidence}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
