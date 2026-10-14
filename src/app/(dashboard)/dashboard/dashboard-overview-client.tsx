"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { MultiBrandComparison } from "@/components/dashboard/multi-brand-comparison";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ArrowLeft, BarChart3 } from "lucide-react";
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
  currency: string;
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
  currency,
  allBrands,
  initialData,
  comparisonData,
}: DashboardOverviewClientProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // Fetch dashboard data with SWR
  const { data, error } = useSWR<DashboardOverviewClientProps["initialData"]>(
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
    setFeedback(null);
    try {
      await mutate(`/api/dashboard/${brandId}/overview`, fetcher(`/api/dashboard/${brandId}/overview`), { revalidate: false });
      setFeedback({ type: "success", message: "Overview updated." });
    } catch {
      setFeedback({ type: "error", message: "Couldn’t refresh the overview. Please try again." });
    } finally {
      setIsRefreshing(false);
    }
  }, [brandId, mutate]);

  const handleSync = useCallback(async (platform: string) => {
    if (isSyncing) return;
    setIsSyncing(platform);
    setFeedback(null);
    try {
      const res = await fetch(`/api/brands/${brandId}/sync${platform === "shopify" ? "/shopify" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platform === "shopify" ? { type: "orders" } : { platform }),
      });

      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Sync failed. Please try again.");
      await mutate(`/api/dashboard/${brandId}/overview`, fetcher(`/api/dashboard/${brandId}/overview`), { revalidate: false });
      setFeedback({ type: response.result?.errors > 0 ? "error" : "success", message: response.result?.errors > 0 ? "Sync finished with some errors. Check your connection in brand settings and try again." : "Sync complete. Your overview is up to date." });
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Couldn’t sync. Please try again." });
    } finally {
      setIsSyncing(null);
    }
  }, [brandId, mutate, isSyncing]);

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
    if (selectedBrands.length >= 1) {
      const params = new URLSearchParams();
      params.set("compare", [...selectedBrands, brandId].join(","));
      router.push(`/dashboard?${params.toString()}`);
    }
  };

  const connections = data?.connections || initialData.connections;
  const quickStats = data?.quickStats || initialData.quickStats;
  const topCampaigns = data?.topCampaigns || initialData.topCampaigns;
  const recentActivity = data?.recentActivity?.map((activity) => ({
    ...activity,
    timestamp: new Date(activity.timestamp),
  })) || initialData.recentActivity;

  const isViewer = userRole === "viewer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/brands">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Brands
            </Link>
          </Button>
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight" title={brandName}>
              {brandName}
            </h1>
            <Badge variant="secondary" className="capitalize">{userRole}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allBrands.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
              aria-expanded={compareMode}
              aria-controls="brand-comparison"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare Brands
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || !!isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {feedback && (
        <div role={feedback.type === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${feedback.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {feedback.message}
        </div>
      )}
      {error && !feedback && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Live updates are unavailable. Showing the last loaded overview. Use Refresh to retry.</p>}

      {/* Comparison Mode */}
      {compareMode && (
        <Card id="brand-comparison" className="border-dashed">
          <CardHeader>
            <CardTitle>Select Brands to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {allBrands
                .filter((b) => b.id !== brandId)
                .map((brand) => (
                  <button
                    type="button"
                    aria-pressed={selectedBrands.includes(brand.id)}
                    disabled={selectedBrands.length >= 4 && !selectedBrands.includes(brand.id)}
                    key={brand.id}
                    className={`p-3 text-left rounded-lg border-2 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
                  </button>
                ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <p className="text-sm text-muted-foreground">
                {selectedBrands.length}/4 additional brands selected. {brandName} is included.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCompareMode(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCompare}
                  disabled={selectedBrands.length < 1}
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
        syncingPlatform={isSyncing}
        settingsHref={`/dashboard/brands/${brandId}/settings`}
        currency={currency}
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
