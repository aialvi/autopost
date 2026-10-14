"use client";

import { Reveal } from "./reveal";

function MiniKpiCard({
  label,
  value,
  trend,
  delay,
}: {
  label: string;
  value: string;
  trend?: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay} direction="up" duration={0.5}>
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[var(--ap-border)] px-4 py-3 min-w-[140px]">
        <div className="text-xs font-medium text-[var(--ap-muted)] mb-1">{label}</div>
        <div className="text-lg font-bold text-[var(--ap-foreground)]">{value}</div>
        {trend && (
          <div className="text-xs font-medium text-[var(--ap-primary)] mt-0.5 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {trend}
          </div>
        )}
      </div>
    </Reveal>
  );
}

function DashboardPreview() {
  return (
    <Reveal delay={0.3} direction="up" duration={0.7}>
      <div
        className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-[var(--ap-border)] overflow-hidden"
        aria-label="AutoPost dashboard preview — illustrative demo data"
        role="img"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--ap-border)] bg-[var(--ap-surface)]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="text-xs font-medium text-[var(--ap-muted)]">AutoPost Dashboard</div>
          <div className="w-16" />
        </div>

        {/* Dashboard content */}
        <div className="p-5 space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Revenue", value: "$48,290", color: "bg-[var(--ap-mint)]" },
              { label: "Ad Spend", value: "$12,450", color: "bg-orange-50" },
              { label: "Profit", value: "$18,760", color: "bg-emerald-50" },
              { label: "ROAS", value: "3.88x", color: "bg-blue-50" },
            ].map((kpi) => (
              <div key={kpi.label} className={`${kpi.color} rounded-xl px-3 py-2.5`}>
                <div className="text-[10px] font-medium text-[var(--ap-muted)]">{kpi.label}</div>
                <div className="text-sm font-bold text-[var(--ap-foreground)] mt-0.5">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div className="bg-[var(--ap-surface)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[var(--ap-foreground)]">Revenue vs Profit</span>
              <span className="text-[10px] text-[var(--ap-muted)]">Last 7 days</span>
            </div>
            <svg viewBox="0 0 280 60" className="w-full h-auto" aria-hidden="true">
              {/* Revenue line */}
              <path
                d="M0,45 C40,42 60,30 100,25 C140,20 180,18 220,12 C250,8 270,5 280,3"
                fill="none"
                stroke="var(--ap-primary)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Revenue area */}
              <path
                d="M0,45 C40,42 60,30 100,25 C140,20 180,18 220,12 C250,8 270,5 280,3 V60 H0 Z"
                fill="var(--ap-primary)"
                fillOpacity="0.08"
              />
              {/* Profit line */}
              <path
                d="M0,50 C40,48 60,42 100,38 C140,35 180,32 220,28 C250,25 270,22 280,20"
                fill="none"
                stroke="var(--ap-primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="4 3"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* Platform icons row */}
          <div className="flex items-center gap-2">
            {["Meta", "Google", "TikTok", "Shopify"].map((platform) => (
              <div
                key={platform}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[var(--ap-border)] rounded-lg text-[10px] font-medium text-[var(--ap-muted)]"
              >
                <div className="w-3 h-3 rounded-full bg-[var(--ap-primary)] opacity-60" />
                {platform}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function AiInsightMini() {
  return (
    <Reveal delay={0.7} direction="left" duration={0.5}>
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[var(--ap-border)] p-4 max-w-[220px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--ap-mint)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3 3l1.5 1.5M9.5 9.5L11 11M11 3L9.5 4.5M4.5 9.5L3 11" stroke="var(--ap-primary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[var(--ap-foreground)]">AI Insight</span>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--ap-muted)]">
          Revenue up 24% this week. Consider increasing budget on Campaign #3.
        </p>
      </div>
    </Reveal>
  );
}

export function HeroVisual() {
  return (
    <div className="relative isolate w-full max-w-[620px] mx-auto lg:mx-0">
      {/* Mint background shape */}
      <div
        className="absolute -top-8 -right-8 w-[90%] h-[85%] bg-[var(--ap-mint)] rounded-[32px] -z-10"
        aria-hidden="true"
      />

      {/* Decorative dots */}
      <div className="absolute -bottom-6 -left-6 w-24 h-24 opacity-30 -z-10" aria-hidden="true">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          {Array.from({ length: 36 }).map((_, i) => (
            <circle
              key={i}
              cx={8 + (i % 6) * 16}
              cy={8 + Math.floor(i / 6) * 16}
              r="2"
              fill="var(--ap-primary)"
              opacity="0.4"
            />
          ))}
        </svg>
      </div>

      {/* Main dashboard */}
      <div className="relative">
        <DashboardPreview />

        {/* Floating KPI cards */}
        <div className="absolute left-0 sm:-left-10 top-[30%] z-10">
          <MiniKpiCard label="Profit" value="$18,760" trend="+18.3%" delay={0.5} />
        </div>

        <div className="absolute right-0 sm:-right-8 top-[10%] z-10">
          <MiniKpiCard label="Campaigns" value="12 active" delay={0.6} />
        </div>

        {/* AI Insight card */}
        <div className="absolute right-0 sm:-right-6 bottom-[5%] z-10">
          <AiInsightMini />
        </div>
      </div>
    </div>
  );
}
