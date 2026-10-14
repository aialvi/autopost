"use client";

export function BrandDashboardPreview() {
  const brands = [
    { name: "Stellar Gear", status: "Active", revenue: "$18,240", campaigns: 5, color: "bg-emerald-500" },
    { name: "Urban Bloom", status: "Active", revenue: "$14,890", campaigns: 3, color: "bg-violet-500" },
    { name: "NovaTech", status: "Paused", revenue: "$8,620", campaigns: 2, color: "bg-amber-500" },
  ];

  return (
    <div
      className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-[var(--ap-border)] overflow-hidden"
      aria-label="Multi-brand management preview — illustrative demo data"
      role="img"
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--ap-border)] bg-[var(--ap-surface)] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--ap-foreground)]">Brand Switcher</div>
          <div className="text-xs text-[var(--ap-muted)]">3 brands connected</div>
        </div>
        <div className="px-3 py-1.5 bg-[var(--ap-mint)] text-[var(--ap-primary-dark)] text-xs font-medium rounded-lg">
          Demo
        </div>
      </div>

      {/* Brand cards */}
      <div className="p-4 sm:p-5 space-y-3">
        {brands.map((brand, i) => (
          <div
            key={brand.name}
            className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
              i === 0
                ? "border-[var(--ap-primary)]/30 bg-[var(--ap-mint-light)] shadow-[0_2px_8px_rgba(0,184,90,0.08)]"
                : "border-[var(--ap-border)] hover:border-[var(--ap-border)]"
            }`}
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 ${brand.color} rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {brand.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--ap-foreground)] truncate">{brand.name}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  brand.status === "Active"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}>
                  {brand.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--ap-muted)]">
                <span>{brand.revenue} rev.</span>
                <span>{brand.campaigns} campaigns</span>
              </div>
            </div>
            {i === 0 && (
              <div className="w-5 h-5 rounded-full bg-[var(--ap-primary)] flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Performance comparison */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <div className="bg-[var(--ap-surface)] rounded-xl p-3 sm:p-4">
          <div className="text-xs font-semibold text-[var(--ap-foreground)] mb-3">Brand Performance</div>
          <div className="space-y-2">
            {brands.map((brand) => (
              <div key={brand.name} className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--ap-muted)] w-20 truncate">{brand.name}</span>
                <div className="flex-1 h-2 bg-[var(--ap-border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--ap-primary)] rounded-full"
                    style={{
                      width: brand.name === "Stellar Gear" ? "82%" : brand.name === "Urban Bloom" ? "64%" : "38%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
