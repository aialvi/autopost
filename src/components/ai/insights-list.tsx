"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

export interface Insight {
  id: string;
  type: "positive" | "negative" | "neutral";
  category: "performance" | "trend" | "opportunity" | "warning";
  title: string;
  description: string;
  metrics: Array<{
    label: string;
    value: number;
    change?: number;
  }>;
  recommendations?: string[];
}

interface InsightsListProps {
  insights: Insight[];
}

const typeConfig = {
  positive: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900",
  },
  negative: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900",
  },
  neutral: {
    icon: Lightbulb,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900",
  },
};

const categoryColors = {
  performance: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  trend: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  opportunity: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function InsightsList({ insights }: InsightsListProps) {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No insights available. Connect more data sources to get AI-powered insights.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => {
            const config = typeConfig[insight.type];
            const Icon = config.icon;
            const isExpanded = expandedInsight === insight.id;

            return (
              <div
                key={insight.id}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={`p-2 rounded-full ${config.bgColor} ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <Badge className="text-xs" variant="outline">
                        {insight.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-3 py-3">
                      {insight.metrics.map((metric, i) => (
                        <div key={i} className="text-sm">
                          <div className="text-muted-foreground">{metric.label}</div>
                          <div className="font-medium">
                            {typeof metric.value === "number" && metric.label.includes("%")
                              ? metric.value.toFixed(1) + "%"
                              : typeof metric.value === "number" && metric.label.includes("$")
                              ? "$" + metric.value.toFixed(2)
                              : metric.value.toLocaleString()}
                            {metric.change !== undefined && (
                              <span
                                className={`ml-2 ${
                                  metric.change >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {metric.change >= 0 ? "+" : ""}
                                {metric.change.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recommendations */}
                    {insight.recommendations && insight.recommendations.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Recommendations:
                        </div>
                        <ul className="space-y-1">
                          {insight.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
