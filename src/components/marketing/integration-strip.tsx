import { Reveal } from "./reveal";

const integrations = [
  {
    name: "Shopify",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15.34 3.04c-.08 0-.16.04-.2.12-.04.04-1 2.08-1 2.08s-1.12-.24-1.24-.28c-.04 0-.08-.04-.12-.04-.24-1-1.08-1.48-1.12-1.48-.08-.04-.12-.04-.2-.04-.04 0-.76.08-.76.08-.04-1.28-.56-2.28-1.56-2.28h-.08C8.78.84 8.46.8 8.18.8c-2.24.08-3.32 2.8-3.64 4.24-.84.28-1.44.44-1.52.48-.44.16-.48.16-.52.56C2.46 6.4 1 18.16 1 18.16l11.2 2.08L18 19s-2.6-15.6-2.64-15.88c-.04-.04-.04-.08-.08-.08h.04zm-3.72 1.64c0 .04-.48 1.48-.48 1.48s-.52-.28-1.2-.28c0 0 .04 0 0 0-.96.04-1 .68-1 .84 0 .92 2.4 1.28 2.4 3.44 0 1.72-1.08 2.8-2.56 2.8-1.72 0-2.6-1.08-2.6-1.08l.48-1.52s.92.76 1.68.76c.52 0 .72-.4.72-.68 0-1.2-1.96-1.24-1.96-3.24 0-1.68 1.2-3.28 3.6-3.28.4 0 .72.08.92.16v.6zM16 3.52c.04 0 .08.04.08.04s.04.04.04.12c.04.32 1.16 7.64 1.76 11.6l-4.04.88s.4-5.96.4-6.04c.04-.16.12-.24.24-.32.08-.04 1.52-6.28 1.52-6.28z" fill="#95BF47" />
      </svg>
    ),
  },
  {
    name: "Meta Ads",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2" />
      </svg>
    ),
  },
  {
    name: "Google Ads",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5 5 18" stroke="#FBBC04" strokeWidth="7" strokeLinecap="round" />
        <path d="M12 5 19 18" stroke="#4285F4" strokeWidth="7" strokeLinecap="round" />
        <circle cx="5" cy="18" r="3.5" fill="#34A853" />
      </svg>
    ),
  },
  {
    name: "TikTok Ads",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0115.54 3h-3.09v12.4a2.592 2.592 0 01-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.3 1.38V7.3s-1.88.09-3.24-1.48z" fill="#171A18" />
      </svg>
    ),
  },
  {
    name: "Snapchat Ads",
    icon: <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#FFFC00" /><path d="M8 10V8a4 4 0 0 1 8 0v2l2 1-2 2 1 3-3 1-2-1-2 1-3-1 1-3-2-2z" fill="white" stroke="#171A18" strokeWidth="1.3" strokeLinejoin="round" /></svg>,
  },
  {
    name: "Telegram",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.28-.02-.12.02-2.02 1.28-5.7 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.89.03-.24.38-.49 1.05-.74 4.11-1.79 6.85-2.97 8.24-3.54 3.93-1.62 4.75-1.9 5.28-1.91.12 0 .38.03.55.17.14.12.18.28.2.44-.01.06.01.24 0 .38z" fill="#229ED9" />
      </svg>
    ),
  },
];

export function IntegrationStrip() {
  return (
    <section
      id="integrations"
      className="py-16 sm:py-20 bg-[var(--ap-mint-light)]"
    >
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <Reveal direction="up" duration={0.5}>
          <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ap-foreground)] mb-10">
            All your marketing tools. One connected workspace.
          </h2>
        </Reveal>

        <Reveal direction="up" delay={0.15} duration={0.5}>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {integrations.map((integration, i) => (
              <div
                key={integration.name}
                className="flex items-center gap-3 px-5 py-3 bg-white border border-[var(--ap-border)] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-[var(--ap-primary)]/20 transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                  {integration.icon}
                </div>
                <span className="text-sm font-semibold text-[var(--ap-foreground)] whitespace-nowrap">
                  {integration.name}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
