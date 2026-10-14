import Link from "next/link";
import { Reveal } from "./reveal";
import { HeroVisual } from "./hero-visual";

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-8 sm:pb-24 sm:pt-12 lg:pb-32 lg:pt-16">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="min-w-0 max-w-xl">
            <Reveal delay={0} direction="up" duration={0.5}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--ap-mint)] border border-[var(--ap-primary)]/15 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-[var(--ap-primary)] animate-pulse" />
                <span className="text-sm font-medium text-[var(--ap-primary-dark)]">
                  Profit clarity for every brand
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.1} direction="up" duration={0.6}>
              <h1 className="text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3.5rem] lg:text-[3.5rem] xl:text-[4rem] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--ap-foreground)] mb-6">
                Run your brands.
                <br />
                Grow your sales.
                <br />
                <span className="text-[var(--ap-primary)]">Know your profit.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.2} direction="up" duration={0.6}>
              <p className="text-lg sm:text-xl leading-relaxed text-[var(--ap-muted)] mb-8 max-w-[480px]">
                Connect your Shopify store, manage ads across platforms, track real
                profit, and turn marketing data into smarter decisions — all from one
                workspace.
              </p>
            </Reveal>

            <Reveal delay={0.3} direction="up" duration={0.5}>
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-white bg-[var(--ap-primary)] hover:bg-[var(--ap-primary-hover)] rounded-xl transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,184,90,0.3)] active:scale-[0.97]"
                >
                  Create an account
                  <svg
                    className="ml-2 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/login?demo=1"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-[var(--ap-foreground)] bg-white border border-[var(--ap-border)] hover:border-[var(--ap-primary)]/30 hover:bg-[var(--ap-mint-light)] rounded-xl transition-all duration-200"
                >
                  Explore the demo
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.4} direction="up" duration={0.5}>
              <p className="text-sm text-[var(--ap-muted)]">
                Try three sample brands. No account connections needed.
              </p>
            </Reveal>
          </div>

          {/* Right: Visual composition */}
          <div className="relative min-w-0 lg:pl-8">
            <HeroVisual />
          </div>
        </div>
      </div>

      {/* Decorative green arc */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--ap-mint-light)] to-transparent pointer-events-none"
        aria-hidden="true"
      />
    </section>
  );
}
