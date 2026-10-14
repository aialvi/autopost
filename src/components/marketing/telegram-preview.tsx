"use client";

import Image from "next/image";

export function TelegramPreview() {
  return (
    <div className="relative">
      {/* Background photo */}
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <Image
          src="/images/marketing/team-workspace.webp"
          alt="Team collaborating around a laptop"
          width={800}
          height={500}
          className="w-full h-[280px] sm:h-[360px] object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* Phone notification mockup */}
      <div
        className="absolute top-6 sm:top-8 right-4 sm:right-8 w-[220px] sm:w-[260px]"
        aria-label="Telegram notification preview — illustrative demo data"
        role="img"
      >
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-[var(--ap-border)] overflow-hidden">
          {/* Phone header */}
          <div className="bg-[#229ED9] px-4 py-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.07-.2.26.26 0 00-.28-.02c-.12.02-2.02 1.28-5.7 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.89.03-.24.38-.49 1.05-.74 4.11-1.79 6.85-2.97 8.24-3.54 3.93-1.62 4.75-1.9 5.28-1.91.12 0 .38.03.55.17.14.12.18.28.2.44-.01.06.01.24 0 .38z" />
            </svg>
            <span className="text-white text-xs font-semibold">AutoPost Alerts</span>
          </div>

          {/* Notifications */}
          <div className="divide-y divide-[var(--ap-border)]">
            {[
              {
                icon: "📊",
                title: "Daily Performance Report",
                message: "Revenue: $2,145 | Profit: $892 | ROAS: 3.6x",
                time: "9:00 AM",
              },
              {
                icon: "⚡",
                title: "Campaign Alert",
                message: "Meta Ads Campaign #3 exceeded daily budget by 15%",
                time: "11:30 AM",
              },
              {
                icon: "🎯",
                title: "Weekly Summary",
                message: "Revenue: $15,015 | Profit: $6,244 this week",
                time: "2:15 PM",
              },
            ].map((notification) => (
              <div key={notification.title} className="px-3 py-2.5 hover:bg-[var(--ap-surface)] transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-sm" aria-hidden="true">{notification.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[var(--ap-foreground)] truncate">
                      {notification.title}
                    </div>
                    <div className="text-[10px] text-[var(--ap-muted)] leading-relaxed mt-0.5 line-clamp-2">
                      {notification.message}
                    </div>
                    <div className="text-[9px] text-[var(--ap-muted)] opacity-60 mt-1">{notification.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
