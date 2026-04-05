"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingCart } from "lucide-react";

interface AttributionData {
  byPlatform: Array<{ platform: string; attributedRevenue: number; conversions: number }>;
  byCampaign: Array<{ campaignId: string; campaignName: string; attributedRevenue: number; conversions: number }>;
}

interface AttributionBreakdownProps {
  brandId: string;
}

type AttributionModel = "first_click" | "last_click" | "linear" | "time_decay" | "position_based";

const models: Record<AttributionModel, string> = {
  first_click: "First Click",
  last_click: "Last Click",
  linear: "Linear",
  time_decay: "Time Decay",
  position_based: "Position Based",
};

export function AttributionBreakdown({ brandId }: AttributionBreakdownProps) {
  const [data, setData] = useState<AttributionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [model, setModel] = useState<AttributionModel>("last_click");

  useEffect(() => {
    fetchData();
  }, [brandId, model]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/brands/${brandId}/attribution?model=${model}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching attribution data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = data?.byPlatform.reduce((sum, p) => sum + p.attributedRevenue, 0) || 0;
  const totalConversions = data?.byPlatform.reduce((sum, p) => sum + p.conversions, 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const platformColors: Record<string, string> = {
    meta: "bg-blue-500",
    google: "bg-red-500",
    snapchat: "bg-yellow-500",
    tiktok: "bg-black dark:bg-white",
    direct: "bg-gray-500",
    email: "bg-green-500",
    organic: "bg-purple-500",
  };

  return (
    <div className="space-y-6">
      {/* Model Selector & Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Attribution Model</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={model} onValueChange={(v) => setModel(v as AttributionModel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(models).map(([key, label]) => (
                  <SelectItem key={key} itemValue={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attributed Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">
                {isLoading ? "—" : formatCurrency(totalRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attributed Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">
                {isLoading ? "—" : totalConversions.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Platform */}
      <Card>
        <CardHeader>
          <CardTitle>Attribution by Platform</CardTitle>
          <CardDescription>
            Revenue and conversions attributed to each platform using {models[model]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : !data || data.byPlatform.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attribution data available
            </div>
          ) : (
            <div className="space-y-4">
              {data.byPlatform
                .sort((a, b) => b.attributedRevenue - a.attributedRevenue)
                .map((platform) => {
                  const percentage = totalRevenue > 0
                    ? (platform.attributedRevenue / totalRevenue) * 100
                    : 0;

                  return (
                    <div key={platform.platform} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded ${platformColors[platform.platform] || "bg-gray-500"}`}
                          />
                          <span className="capitalize font-medium">{platform.platform}</span>
                          <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(platform.attributedRevenue)}</span>
                          <span className="text-muted-foreground ml-2">
                            {platform.conversions} conversions
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns by Attribution</CardTitle>
          <CardDescription>
            Campaigns with the highest attributed revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : !data || data.byCampaign.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No campaign attribution data available
            </div>
          ) : (
            <div className="space-y-2">
              {data.byCampaign
                .sort((a, b) => b.attributedRevenue - a.attributedRevenue)
                .slice(0, 10)
                .map((campaign, index) => (
                  <div
                    key={campaign.campaignId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{campaign.campaignName}</div>
                        <div className="text-xs text-muted-foreground">
                          {campaign.conversions} conversions
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(campaign.attributedRevenue)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
