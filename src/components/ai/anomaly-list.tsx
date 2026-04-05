"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Lightbulb, CheckCircle, XCircle, Eye } from "lucide-react";

export interface Anomaly {
  id: string;
  type: "spend_spike" | "roas_drop" | "ctr_drop" | "conversion_drop" | "unusual_metric";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  value: number;
  expectedValue: number;
  deviation: number;
  date: string;
  platform?: string;
}

interface AnomalyListProps {
  anomalies: Anomaly[];
}

const severityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const typeIcons = {
  spend_spike: TrendingUp,
  roas_drop: TrendingDown,
  ctr_drop: TrendingDown,
  conversion_drop: XCircle,
  unusual_metric: AlertTriangle,
};

export function AnomalyList({ anomalies }: AnomalyListProps) {
  if (!anomalies || anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>No anomalies detected in the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Anomalies Detected</CardTitle>
          <Badge variant="outline">{anomalies.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {anomalies.map((anomaly) => {
            const Icon = typeIcons[anomaly.type] || AlertTriangle;

            return (
              <div
                key={anomaly.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <div className={`p-2 rounded-full ${severityColors[anomaly.severity]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{anomaly.title}</h4>
                    {anomaly.platform && (
                      <Badge variant="outline" className="text-xs">
                        {anomaly.platform}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {anomaly.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Value: ${anomaly.value.toFixed(2)}</span>
                    <span>Expected: ${anomaly.expectedValue.toFixed(2)}</span>
                    <span>
                      Deviation: {anomaly.deviation > 0 ? "+" : ""}
                      {anomaly.deviation.toFixed(1)}σ
                    </span>
                    <span>{anomaly.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
