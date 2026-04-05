"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { MultiBrandComparison } from "@/components/dashboard/multi-brand-comparison";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Plus, ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";

interface QuickStats {
  todayRevenue: number;
  todayOrders: number;
  todayAdSpend: number;
  activeCampaigns: number;
}

interface Connections {
  shopify: boolean;
  meta: boolean;
  snapchat: boolean;
  google: boolean;
  tiktok: boolean;
}

interface TopCampaign {
  id: string;
  name: string;
  platform: string;
  spend: number;
  roas: number;
  status: string;
}

interface Brand {
  id: string;
  name: string;
  userRole: string;
  timezone: string;
  currency: string;
}

interface ComparisonData {
  comparisons: Array<{
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
  }>;
}

interface DashboardOverviewClientProps {
  brandId: string;
  brandName: string;
  userRole: string;
  allBrands: Brand[];
  initialData: {
    connections: Connections;
    quickStats: QuickStats;
    topCampaigns: TopCampaign[];
    recentActivity: Array<{
      type: "order" | "sync" | "alert";
      message: string;
      timestamp: Date;
    }>;
  };
  comparisonData: ComparisonData | null;
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function DashboardOverviewClient({
  brandId,
  brandName,
  userRole,
  allBrands,
  initialData,
  comparisonData,
}: DashboardOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // Fetch dashboard data with SWR
  const { data, error, isLoading } = useSWR(
    `/api/dashboard/${brandId}/overview`,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await mutate(`/api/dashboard/${brandId}/overview`);
    } finally {
      setIsRefreshing(false);
    }
  }, [brandId, mutate]);

  const handleSync = useCallback(async (platform: string) => {
    setIsSyncing(platform);
    try {
      const res = await fetch(`/api/brands/${brandId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });

      if (res.ok) {
        await mutate(`/api/dashboard/${brandId}/overview`);
      }
    } finally {
      setIsSyncing(null);
    }
  }, [brandId, mutate]);

  const toggleBrandSelection = (brandId: string) => {
    setSelectedBrands((prev) => {
      if (prev.includes(brandId)) {
        return prev.filter((id) => id !== brandId);
      }
      if (prev.length < 4) {
        return [...prev, brandId];
      }
      return prev;
    });
  };

  const handleCompare = () => {
    if (selectedBrands.length >= 2) {
      const params = new URLSearchParams();
      params.set("compare", [...selectedBrands, brandId].join(","));
      router.push(`/dashboard?${params.toString()}`);
    }
  };

  const connections = data?.connections || initialData.connections;
  const quickStats = data?.quickStats || initialData.quickStats;
  const topCampaigns = data?.topCampaigns || initialData.topCampaigns;
  const recentActivity = data?.recentActivity?.map((activity: any) => ({
    ...activity,
    timestamp: new Date(activity.timestamp),
  })) || initialData.recentActivity;

  const isViewer = userRole === "viewer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Brands
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {brandName}
            </h1>
            <p className="text-muted-foreground text-sm capitalize">
              {userRole} Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isViewer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare Brands
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Comparison Mode */}
      {compareMode && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Select Brands to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {allBrands
                .filter((b) => b.id !== brandId)
                .slice(0, 8)
                .map((brand) => (
                  <div
                    key={brand.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedBrands.includes(brand.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleBrandSelection(brand.id)}
                  >
                    <div className="text-sm font-medium">{brand.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {brand.userRole}
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {selectedBrands.length}/4 additional brands selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCompareMode(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCompare}
                  disabled={selectedBrands.length < 2}
                >
                  Compare ({selectedBrands.length + 1} brands)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Brand Comparison (if active) */}
      {comparisonData && comparisonData.comparisons && comparisonData.comparisons.length > 0 && (
        <MultiBrandComparison comparisons={comparisonData.comparisons} />
      )}

      {/* Dashboard Overview */}
      <DashboardOverview
        connections={connections}
        quickStats={quickStats}
        topCampaigns={topCampaigns}
        recentActivity={recentActivity}
        onSync={isViewer ? undefined : handleSync}
        brandName={brandName}
      />

      {/* Quick Actions */}
      {!isViewer && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/profit?brandId=${brandId}`}>
                  View Profit Analytics
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/ai?brandId=${brandId}`}>
                  View AI Insights
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/campaigns?brandId=${brandId}`}>
                  Manage Campaigns
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/expenses?brandId=${brandId}`}>
                  Manage Expenses
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/dashboard/brands/${brandId}/settings`}>
                  Brand Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
