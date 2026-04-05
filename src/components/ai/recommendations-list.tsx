"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  TrendingUp,
  Pause,
  Play,
  Eye,
  Rocket,
  DollarSign,
  BarChart3,
} from "lucide-react";

export interface Recommendation {
  id: string;
  actionType: "kill" | "scale" | "watch" | "launch";
  title: string;
  reasoning: string;
  currentMetrics: {
    spend?: number;
    roas?: number;
    ctr?: number;
    conversions?: number;
  };
  recommendedChanges: {
    action: "increase" | "decrease" | "pause" | "resume";
    targetValue?: number;
    budget?: number;
  };
}

interface RecommendationsListProps {
  recommendations: Recommendation[];
  onAction?: (id: string, action: "approve" | "decline") => void;
}

const actionConfig = {
  kill: {
    icon: X,
    label: "Kill/Pause",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900",
    borderColor: "border-red-200 dark:border-red-800",
  },
  scale: {
    icon: Rocket,
    label: "Scale Up",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900",
    borderColor: "border-green-200 dark:border-green-800",
  },
  watch: {
    icon: Eye,
    label: "Monitor",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  launch: {
    icon: Play,
    label: "Launch",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
};

export function RecommendationsList({ recommendations, onAction }: RecommendationsListProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No recommendations at this time. Continue optimizing your campaigns.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Recommendations</CardTitle>
          <Badge variant="outline">{recommendations.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const config = actionConfig[rec.actionType];
            const Icon = config.icon;

            return (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${config.bgColor} ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{rec.title}</h4>
                      <Badge className="text-xs" variant="outline">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rec.reasoning}</p>

                    {/* Current Metrics */}
                    <div className="flex flex-wrap gap-4 mb-3">
                      {rec.currentMetrics.spend !== undefined && (
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">${rec.currentMetrics.spend.toFixed(2)}</span>
                        </div>
                      )}
                      {rec.currentMetrics.roas !== undefined && (
                        <div className="flex items-center gap-1 text-xs">
                          <BarChart3 className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{rec.currentMetrics.roas.toFixed(2)}x ROAS</span>
                        </div>
                      )}
                      {rec.currentMetrics.ctr !== undefined && (
                        <div className="flex items-center gap-1 text-xs">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{rec.currentMetrics.ctr.toFixed(2)}% CTR</span>
                        </div>
                      )}
                    </div>

                    {/* Recommended Changes */}
                    {rec.recommendedChanges.budget && (
                      <div className="text-xs bg-background/50 rounded px-2 py-1 inline-block">
                        <span className="text-muted-foreground">Suggested budget: </span>
                        <span className="font-medium">${rec.recommendedChanges.budget.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {onAction && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onAction(rec.id, "approve")}
                          className="flex-1"
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAction(rec.id, "decline")}
                          className="flex-1"
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
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
