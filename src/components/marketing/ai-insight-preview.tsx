"use client";

export function AiInsightPreview() {
  const insights = [
    {
      type: "anomaly",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3v5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      iconBg: "bg-amber-50 text-amber-500",
      title: "Ad spend anomaly detected",
      description: "Meta Ads spend increased 34% vs. last week without a corresponding revenue lift. Review Campaign #7.",
      time: "2 hours ago",
    },
    {
      type: "insight",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 12l3-4 2 2 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      iconBg: "bg-[var(--ap-mint)] text-[var(--ap-primary)]",
      title: "Profit margin improving",
      description: "Your 7-day profit margin is at 38.8%, up from 32.1% the previous period.",
      time: "4 hours ago",
    },
    {
      type: "opportunity",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M12.5 3.5L11 5M5 11L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      iconBg: "bg-violet-50 text-violet-500",
      title: "Optimization opportunity",
      description: "Google Ads Campaign 'Brand Search' has the highest ROAS at 4.2x. Consider increasing its daily budget.",
      time: "6 hours ago",
    },
    {
      type: "trend",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 12l4-4 3 2 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 4h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      iconBg: "bg-blue-50 text-blue-500",
      title: "Upward revenue trend",
      description: "Revenue has grown consistently for 3 consecutive weeks. Current trajectory suggests $52K this month.",
      time: "1 day ago",
    },
  ];

  return (
    <div
      className="space-y-3"
      aria-label="AI-powered insights preview — illustrative demo data"
      role="img"
    >
      {insights.map((insight) => (
        <div
          key={insight.title}
          className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] border border-[var(--ap-border)] p-4 sm:p-5 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-xl ${insight.iconBg} flex items-center justify-center shrink-0`}>
              {insight.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-[var(--ap-foreground)]">{insight.title}</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--ap-muted)]">{insight.description}</p>
              <span className="text-[10px] text-[var(--ap-muted)] mt-2 inline-block opacity-60">{insight.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
