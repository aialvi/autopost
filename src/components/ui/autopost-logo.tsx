import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function AutoPostLogo({ href = "/", inverse = false }: { href?: string; inverse?: boolean }) {
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2" aria-label={href === "/dashboard" ? "AutoPost dashboard" : "AutoPost home"}>
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105", inverse ? "bg-[#b9f4d2] text-[#102c20]" : "bg-[var(--ap-primary)] text-white")}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M9 2L3 6v6l6 4 6-4V6L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 6v6M6 8.5l3 1.5 3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={cn("text-xl font-semibold tracking-tight", inverse ? "text-white" : "text-[var(--ap-foreground)]")}>AutoPost</span>
    </Link>
  );
}
