import { type ReactNode } from "react";
import { Reveal } from "./reveal";
import { BrandDashboardPreview } from "./brand-dashboard-preview";
import { ShopifySyncPreview } from "./shopify-sync-preview";
import { CampaignPreview } from "./campaign-preview";
import { ProfitAnalyticsPreview } from "./profit-analytics-preview";
import { AiInsightPreview } from "./ai-insight-preview";
import { TelegramPreview } from "./telegram-preview";

interface FeatureData {
  eyebrow: string;
  headline: ReactNode;
  copy: string;
  benefits?: string[];
  visual: ReactNode;
  reversed?: boolean;
  bgClass?: string;
}

function FeatureBlock({ feature }: { feature: FeatureData }) {
  const textContent = (
    <div className="flex flex-col justify-center">
      <Reveal direction="up" duration={0.5}>
        <span className="inline-block text-xs font-semibold tracking-[0.08em] uppercase text-[var(--ap-primary)] mb-4">
          {feature.eyebrow}
        </span>
      </Reveal>

      <Reveal direction="up" delay={0.1} duration={0.6}>
        <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ap-foreground)] mb-5">
          {feature.headline}
        </h2>
      </Reveal>

      <Reveal direction="up" delay={0.2} duration={0.5}>
        <p className="text-base sm:text-lg leading-relaxed text-[var(--ap-muted)] mb-6 max-w-[460px]">
          {feature.copy}
        </p>
      </Reveal>

      {feature.benefits && (
        <Reveal direction="up" delay={0.3} duration={0.5}>
          <ul className="space-y-3">
            {feature.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--ap-mint)] flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 5l2 2 4-4" stroke="var(--ap-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm text-[var(--ap-foreground)] font-medium">{benefit}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </div>
  );

  const visualContent = (
    <Reveal direction={feature.reversed ? "left" : "right"} delay={0.15} duration={0.7}>
      {feature.visual}
    </Reveal>
  );

  return (
    <div className={`py-16 sm:py-24 lg:py-32 ${feature.bgClass || ""}`}>
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
          feature.reversed ? "" : ""
        }`}>
          {feature.reversed ? (
            <>
              <div className="order-2 lg:order-1">{visualContent}</div>
              <div className="order-1 lg:order-2">{textContent}</div>
            </>
          ) : (
            <>
              <div>{textContent}</div>
              <div>{visualContent}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const features: FeatureData[] = [
  {
    eyebrow: "Multi-Brand Management",
    headline: (
      <>
        Every brand.
        <br />
        One command center.
      </>
    ),
    copy: "Stop jumping between accounts. Manage all your brands, campaigns, and performance from a single organized workspace.",
    benefits: [
      "Switch between brands instantly",
      "Compare performance side by side",
      "Campaign reporting in one place",
    ],
    visual: <BrandDashboardPreview />,
    bgClass: "bg-[var(--ap-mint-light)]",
  },
  {
    eyebrow: "Shopify Integration",
    headline: (
      <>
        Your store and marketing,
        <br />
        finally in sync.
      </>
    ),
    copy: "Bring Shopify products, orders, and sales insights into one place so your marketing decisions reflect what's actually selling.",
    benefits: [
      "Automatic product and order syncing",
      "Product costs included in your P&L",
      "Orders, refunds, and sales in one view",
    ],
    visual: <ShopifySyncPreview />,
    reversed: true,
  },
  {
    eyebrow: "Ads Reporting",
    headline: (
      <>
        One place for
        <br />
        every campaign.
      </>
    ),
    copy: "Connect Meta, Google, TikTok, and Snapchat Ads to keep campaign performance organized and easier to understand.",
    benefits: [
      "All platforms in one view",
      "Cross-platform ROAS comparison",
      "Spend tracking and budgets",
    ],
    visual: <CampaignPreview />,
    bgClass: "bg-[var(--ap-surface)]",
  },
  {
    eyebrow: "Profit Analytics",
    headline: (
      <>
        Know your profit.
        <br />
        Not just your revenue.
      </>
    ),
    copy: "Understand revenue, ad spend, and costs together to see what your marketing is really contributing.",
    visual: <ProfitAnalyticsPreview />,
    reversed: true,
  },
  {
    eyebrow: "AI-Powered Insights",
    headline: (
      <>
        Smarter decisions,
        <br />
        without the guesswork.
      </>
    ),
    copy: "Spot trends, identify unusual changes, and discover opportunities with AI-powered marketing insights.",
    visual: <AiInsightPreview />,
    bgClass: "bg-[var(--ap-mint-light)]",
  },
  {
    eyebrow: "Smart Notifications",
    headline: (
      <>
        Stay in the loop.
        <br />
        Even when you&apos;re away.
      </>
    ),
    copy: "Get timely alerts and important performance updates through Telegram.",
    benefits: [
      "Daily performance summaries",
      "ROAS, spend, and revenue alerts",
      "Weekly summaries and quiet hours",
    ],
    visual: <TelegramPreview />,
    reversed: true,
  },
];

export function FeatureSections() {
  return (
    <section id="features" aria-label="Product features">
      {features.map((feature, i) => (
        <FeatureBlock key={i} feature={feature} />
      ))}
    </section>
  );
}
