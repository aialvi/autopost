"use client";

export function ProfitAnalyticsPreview() {
  return (
    <div
      className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-[var(--ap-border)] overflow-hidden"
      aria-label="Profit analytics dashboard preview — illustrative demo data"
      role="img"
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--ap-border)] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--ap-foreground)]">Profit Analytics</div>
          <div className="text-xs text-[var(--ap-muted)]">Last 30 days</div>
        </div>
        <div className="flex items-center gap-1">
          {["7D", "30D", "90D"].map((period) => (
            <span
              key={period}
              className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                period === "30D"
                  ? "bg-[var(--ap-primary)] text-white"
                  : "text-[var(--ap-muted)] hover:bg-[var(--ap-surface)]"
              }`}
              aria-hidden="true"
            >
              {period}
            </span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--ap-border)]">
        {[
          { label: "Revenue", value: "$48,290", change: "+12.4%", positive: true },
          { label: "Ad Spend", value: "$12,450", change: "+5.2%", positive: false },
          { label: "Net Profit", value: "$18,760", change: "+18.3%", positive: true },
          { label: "ROAS", value: "3.88x", change: "+0.4x", positive: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white px-4 sm:px-5 py-4">
            <div className="text-[11px] text-[var(--ap-muted)] mb-1">{kpi.label}</div>
            <div className="text-lg sm:text-xl font-bold text-[var(--ap-foreground)]">{kpi.value}</div>
            <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${
              kpi.positive ? "text-[var(--ap-primary)]" : "text-amber-500"
            }`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path
                  d={kpi.positive ? "M2 7l3-3 3 3" : "M2 3l3 3 3-3"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {kpi.change}
            </div>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="p-4 sm:p-6">
        <svg viewBox="0 0 560 160" className="w-full h-auto" aria-hidden="true">
          {/* Grid lines */}
          {[0, 40, 80, 120, 160].map((y) => (
            <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="var(--ap-border)" strokeWidth="0.5" />
          ))}

          {/* Revenue area */}
          <path
            d="M0,120 C30,118 60,110 90,100 C120,90 150,85 180,75 C210,65 240,58 270,52 C300,46 330,42 360,38 C390,34 420,30 450,25 C480,20 510,16 540,12 L560,10 V160 H0 Z"
            fill="var(--ap-primary)"
            fillOpacity="0.06"
          />
          <path
            d="M0,120 C30,118 60,110 90,100 C120,90 150,85 180,75 C210,65 240,58 270,52 C300,46 330,42 360,38 C390,34 420,30 450,25 C480,20 510,16 540,12 L560,10"
            fill="none"
            stroke="var(--ap-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Profit line */}
          <path
            d="M0,135 C30,132 60,128 90,120 C120,112 150,108 180,100 C210,92 240,86 270,80 C300,74 330,70 360,66 C390,62 420,58 450,52 C480,46 510,42 540,38 L560,35"
            fill="none"
            stroke="var(--ap-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            opacity="0.5"
          />

          {/* Ad spend line */}
          <path
            d="M0,148 C30,147 60,145 90,142 C120,140 150,138 180,136 C210,134 240,132 270,130 C300,128 330,126 360,125 C390,124 420,122 450,120 C480,118 510,116 540,115 L560,114"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Highlight dot */}
          <circle cx="360" cy="38" r="4" fill="var(--ap-primary)" />
          <circle cx="360" cy="38" r="7" fill="var(--ap-primary)" fillOpacity="0.15" />
        </svg>

        {/* Chart legend */}
        <div className="flex items-center gap-5 mt-3">
          {[
            { label: "Revenue", color: "bg-[var(--ap-primary)]" },
            { label: "Profit", color: "bg-[var(--ap-primary)] opacity-50", dashed: true },
            { label: "Ad Spend", color: "bg-amber-400" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-[2px] rounded-full ${item.color}`} />
              <span className="text-[11px] text-[var(--ap-muted)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
