"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformBreakdownProps {
  breakdown: Record<string, { spend: number; revenue: number; roas: number }>;
}

const platformInfo: Record<string, { name: string; color: string }> = {
  meta: { name: "Meta (Facebook/Instagram)", color: "bg-blue-500" },
  snapchat: { name: "Snapchat", color: "bg-yellow-500" },
  google: { name: "Google Ads", color: "bg-red-500" },
  tiktok: { name: "TikTok", color: "bg-black dark:bg-white" },
};

export function PlatformBreakdown({ breakdown }: PlatformBreakdownProps) {
  const platforms = Object.entries(breakdown);
  const totalSpend = platforms.reduce((sum, [, data]) => sum + data.spend, 0);

  if (platforms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No ad platform data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {platforms.map(([platform, data]) => {
            const info = platformInfo[platform];
            const percentage = totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0;

            return (
              <div key={platform} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${info.color}`} />
                    <span className="font-medium">{info.name}</span>
                  </div>
                  <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${info.color} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Spend:</span>{" "}
                    <span className="font-medium">${data.spend.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue:</span>{" "}
                    <span className="font-medium">${data.revenue.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROAS:</span>{" "}
                    <span className={`font-medium ${data.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                      {data.roas.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Ad Spend</span>
              <span className="font-semibold">${totalSpend.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
