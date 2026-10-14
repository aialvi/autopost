"use client";

export function CampaignPreview() {
  const campaigns = [
    {
      platform: "Meta",
      platformColor: "bg-blue-500",
      name: "Summer Collection — Retargeting",
      status: "Active",
      spend: "$3,240",
      roas: "4.2x",
      impressions: "128K",
    },
    {
      platform: "Google",
      platformColor: "bg-red-500",
      name: "Brand Search — Exact Match",
      status: "Active",
      spend: "$5,180",
      roas: "3.6x",
      impressions: "89K",
    },
    {
      platform: "TikTok",
      platformColor: "bg-neutral-800",
      name: "New Arrivals — Spark Ads",
      status: "Active",
      spend: "$2,030",
      roas: "2.9x",
      impressions: "245K",
    },
  ];

  return (
    <div
      className="relative"
      aria-label="Campaign management preview — illustrative demo data"
      role="img"
    >
      {/* Stacked campaign cards */}
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign.name}
            className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] border border-[var(--ap-border)] p-4 sm:p-5 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
            
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 ${campaign.platformColor} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {campaign.platform[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-[var(--ap-foreground)] truncate">
                    {campaign.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
                    {campaign.status}
                  </span>
                  <span className="text-[10px] text-[var(--ap-muted)]">{campaign.platform} Ads</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[var(--ap-border)]">
              <div>
                <div className="text-[10px] text-[var(--ap-muted)]">Spend</div>
                <div className="text-sm font-semibold text-[var(--ap-foreground)]">{campaign.spend}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ap-muted)]">ROAS</div>
                <div className="text-sm font-semibold text-[var(--ap-primary)]">{campaign.roas}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ap-muted)]">Impressions</div>
                <div className="text-sm font-semibold text-[var(--ap-foreground)]">{campaign.impressions}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-4 bg-[var(--ap-surface)] rounded-xl p-3 sm:p-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ap-foreground)]">Total across platforms</span>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[var(--ap-muted)]">
            Spend: <strong className="text-[var(--ap-foreground)]">$10,450</strong>
          </span>
          <span className="text-[var(--ap-muted)]">
            Avg ROAS: <strong className="text-[var(--ap-primary)]">3.57x</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
