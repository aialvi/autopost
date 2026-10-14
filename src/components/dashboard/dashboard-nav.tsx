"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Building2, CreditCard, LayoutDashboard, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/brands", label: "Brands", icon: Building2 },
  { href: "/dashboard/profit", label: "Profit", icon: TrendingUp },
  { href: "/dashboard/attribution", label: "Attribution", icon: BarChart3 },
  { href: "/dashboard/ai", label: "AI insights", icon: Sparkles },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-[#eafbf2] text-[#102c20] ring-1 ring-inset ring-[#ccebd9]" : "text-[#5b7063] hover:bg-[#f3f8f5] hover:text-[#102c20]")}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
