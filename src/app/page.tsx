import Link from "next/link";
import { AutoPostLogo } from "@/components/ui/autopost-logo";
import { ArrowRight, Layers3, ChartNoAxesCombined, BellRing, Check } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { IntegrationStrip } from "@/components/marketing/integration-strip";
import { FeatureSections } from "@/components/marketing/feature-section";
import { Reveal } from "@/components/marketing/reveal";

const steps = [
  { title: "Connect your accounts", copy: "Create a brand, connect Shopify, and add the ad accounts you want to track." },
  { title: "Bring your numbers together", copy: "Sync orders and ad spend. Add product costs and expenses for a clearer picture of profit." },
  { title: "Make your next move", copy: "Compare performance, review recommendations, and set up Telegram summaries and alerts." },
];
const benefits = [
  { icon: Layers3, title: "Less switching. More clarity.", copy: "Keep each brand’s accounts and reporting together, with a shared view when you need to compare." },
  { icon: ChartNoAxesCombined, title: "See what you actually keep.", copy: "Look beyond ROAS. See sales after refunds alongside product costs, fees, expenses, and ad spend." },
  { icon: BellRing, title: "Know where to focus.", copy: "Spot changes in performance and review practical recommendations before deciding what to do." },
];
const questions = [
  { question: "Can I explore before connecting my accounts?", answer: "Yes. The demo includes three sample brands with Shopify, Meta, Google, TikTok, and Snapchat data. Explore profit, attribution, AI insights, notifications, and billing without connecting an account. The demo is read-only." },
  { question: "How is profit calculated?", answer: "AutoPost combines Shopify revenue after refunds with product costs, ad spend, estimated payment fees, and the expenses you add. Use your actual product costs or configure a default COGS percentage. Connect accounts in the same currency for consistent reporting." },
  { question: "Will AI change my campaigns automatically?", answer: "AI provides recommendations for you to review. You stay in control of campaign changes and budgets. AI analysis requires a configured provider; performance rules remain available without one." },
  { question: "How do Telegram alerts work?", answer: "Connect your Telegram chat and choose daily or weekly summaries and performance alerts. Configure thresholds, your time zone, and quiet hours to receive the updates that matter to you." },
];

export default function HomePage() {
  return (
    <div className="marketing-page bg-white text-[var(--ap-foreground)]">
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-[60] rounded-lg bg-white p-3 focus:not-sr-only">Skip to content</a>
      <MarketingNavbar />
      <main id="main-content">
        <MarketingHero />
        <IntegrationStrip />
        <div className="border-b border-[var(--ap-border)] bg-white px-5 py-5 text-center text-xs leading-relaxed text-[var(--ap-muted)]">
          Product previews show illustrative sample data. <Link href="/login?demo=1" className="font-semibold text-[var(--ap-primary-dark)] underline underline-offset-4">Explore the interactive demo <span aria-hidden="true">↗</span></Link>
        </div>
        <FeatureSections />
        <section id="how-it-works" className="bg-[var(--ap-surface)] px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="steps-title">
          <div className="mx-auto max-w-[1200px]">
            <Reveal><div className="mx-auto mb-12 max-w-2xl text-center"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--ap-primary-dark)]">How it works</p><h2 id="steps-title" className="text-3xl font-bold tracking-tight sm:text-4xl">From scattered data to a clearer decision.</h2><p className="mt-4 text-[var(--ap-muted)]">Connect once. Build a routine around the numbers that matter.</p></div></Reveal>
            <ol className="grid gap-5 md:grid-cols-3">
              {steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-[var(--ap-border)] bg-white p-7"><span className="mb-8 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ap-mint)] text-sm font-semibold text-[var(--ap-primary-dark)]">0{index + 1}</span><h3 className="mb-3 text-lg font-semibold">{step.title}</h3><p className="text-sm leading-relaxed text-[var(--ap-muted)]">{step.copy}</p></li>)}
            </ol>
          </div>
        </section>
        <section id="benefits" className="px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="benefits-title">
          <div className="mx-auto max-w-[1200px]">
            <Reveal><div className="mb-12 max-w-2xl"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--ap-primary-dark)]">Built for your day-to-day</p><h2 id="benefits-title" className="text-3xl font-bold tracking-tight sm:text-4xl">More time for your brands.<br />A better view of your business.</h2></div></Reveal>
            <div className="grid gap-8 md:grid-cols-3">{benefits.map(({ icon: Icon, title, copy }) => <div key={title}><Icon className="mb-5 h-8 w-8 text-[var(--ap-primary-dark)]" aria-hidden="true" /><h3 className="mb-3 text-lg font-semibold">{title}</h3><p className="text-sm leading-relaxed text-[var(--ap-muted)]">{copy}</p></div>)}</div>
          </div>
        </section>
        <section className="border-t border-[var(--ap-border)] bg-[var(--ap-mint-light)] px-5 py-20 sm:px-8" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.5fr]">
            <div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--ap-primary-dark)]">A few useful answers</p><h2 id="faq-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Before you get started.</h2><p className="mt-4 max-w-sm leading-relaxed text-[var(--ap-muted)]">Get to know the workspace at your own pace.</p></div>
            <div className="space-y-3">{questions.map(({ question, answer }) => <details key={question} className="group rounded-2xl border border-[var(--ap-border)] bg-white p-5"><summary className="cursor-pointer text-sm font-semibold leading-relaxed">{question}</summary><p className="mt-4 text-sm leading-relaxed text-[var(--ap-muted)]">{answer}</p></details>)}</div>
          </div>
        </section>
        <section className="px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="cta-title">
          <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-[#102c20] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[50px] border-white/5" aria-hidden="true" />
            <p className="relative mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-200">Your next chapter starts here</p><h2 id="cta-title" className="relative text-3xl font-bold tracking-tight sm:text-5xl">All your brands.<br />One clearer picture.</h2><p className="relative mx-auto mt-5 max-w-lg text-base leading-relaxed text-emerald-100/80">See the full workspace with sample data, or create an account and start connecting your business.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/login?demo=1" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-[#102c20] hover:bg-emerald-50">Explore the demo <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link href="/register" className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 font-semibold hover:bg-white/10">Create an account</Link></div>
            <p className="relative mt-5 inline-flex items-center gap-2 text-xs text-emerald-100/80"><Check className="h-3.5 w-3.5" aria-hidden="true" />No live accounts needed to try the demo</p>
          </div>
        </section>
      </main>
      <footer className="border-t border-[var(--ap-border)] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><AutoPostLogo /><p className="mt-2 text-xs text-[var(--ap-muted)]">A clearer view of every brand’s performance.</p></div><nav aria-label="Footer" className="flex flex-wrap gap-5 text-sm text-[var(--ap-muted)]"><a href="#features" className="hover:text-[var(--ap-primary-dark)]">Features</a><Link href="/login?demo=1" className="hover:text-[var(--ap-primary-dark)]">Demo</Link><Link href="/login" className="hover:text-[var(--ap-primary-dark)]">Sign in</Link><Link href="/register" className="hover:text-[var(--ap-primary-dark)]">Create account</Link></nav><p className="text-xs text-[var(--ap-muted)]">© {new Date().getFullYear()} AutoPost</p></div></footer>
    </div>
  );
}
