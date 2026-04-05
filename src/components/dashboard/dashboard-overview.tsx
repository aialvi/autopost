"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Activity,
  Check,
  X,
  ArrowRight,
} from "lucide-react";

export interface QuickStats {
  todayRevenue: number;
  todayOrders: number;
  todayAdSpend: number;
  activeCampaigns: number;
}

export interface Connections {
  shopify: boolean;
  meta: boolean;
  snapchat: boolean;
  google: boolean;
  tiktok: boolean;
}

export interface TopCampaign {
  id: string;
  name: string;
  platform: string;
  spend: number;
  roas: number;
  status: string;
}

export interface DashboardOverviewProps {
  connections: Connections;
  quickStats: QuickStats;
  topCampaigns: TopCampaign[];
  recentActivity: Array<{
    type: "order" | "sync" | "alert";
    message: string;
    timestamp: Date;
  }>;
  onSync?: (platform: string) => void;
  brandName?: string;
}

const platformInfo: Record<string, { name: string; color: string }> = {
  shopify: { name: "Shopify", color: "bg-green-500" },
  meta: { name: "Meta", color: "bg-blue-500" },
  snapchat: { name: "Snapchat", color: "bg-yellow-500" },
  google: { name: "Google Ads", color: "bg-red-500" },
  tiktok: { name: "TikTok", color: "bg-black dark:bg-white" },
};

export function DashboardOverview({
  connections,
  quickStats,
  topCampaigns,
  recentActivity,
  onSync,
  brandName,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{brandName || "Dashboard"}</h2>
          <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  ${quickStats.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Orders</p>
                <p className="text-2xl font-bold mt-1">{quickStats.todayOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Ad Spend</p>
                <p className="text-2xl font-bold mt-1">
                  ${quickStats.todayAdSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold mt-1">{quickStats.activeCampaigns}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {Object.entries(platformInfo).map(([key, info]) => {
              const isConnected = connections[key as keyof Connections];

              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 ${
                    isConnected ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-dashed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{info.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {isConnected ? "Connected" : "Not connected"}
                      </div>
                    </div>
                    {isConnected && onSync && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => onSync(key)}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Campaigns */}
      {topCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded ${platformInfo[campaign.platform]?.color}`} />
                    <div>
                      <div className="text-sm font-medium">{campaign.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{campaign.platform}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Spend:</span>{" "}
                      <span className="font-medium">${campaign.spend.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ROAS:</span>{" "}
                      <span className={`font-medium ${campaign.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                        {campaign.roas.toFixed(2)}x
                      </span>
                    </div>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, i) => {
                const icons = {
                  order: ShoppingCart,
                  sync: Activity,
                  alert: X,
                };
                const Icon = icons[activity.type];
                const colors = {
                  order: "text-green-600",
                  sync: "text-blue-600",
                  alert: "text-red-600",
                };

                return (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Icon className={`h-4 w-4 mt-0.5 ${colors[activity.type]}`} />
                    <div className="flex-1">
                      <p>{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
