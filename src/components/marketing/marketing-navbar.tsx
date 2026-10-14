"use client";

import Link from "next/link";
import { AutoPostLogo } from "@/components/ui/autopost-logo";
import { useState, useEffect, useCallback, useRef } from "react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Integrations", href: "#integrations" },
  { label: "Benefits", href: "#benefits" },
];

export function MarketingNavbar() {
  const menuButton = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMobileOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  const handleNavClick = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-sm border-b border-[var(--ap-border)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            : "bg-white/95 border-b border-transparent"
        }`}
        role="banner"
      >
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
          <div className="flex justify-between items-center h-[72px]">
            <AutoPostLogo />

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-[15px] font-medium text-[var(--ap-muted)] hover:text-[var(--ap-foreground)] transition-colors duration-200 group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[var(--ap-primary)] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </a>
              ))}
            </nav>

            {/* Desktop auth */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-[15px] font-medium text-[var(--ap-muted)] hover:text-[var(--ap-foreground)] transition-colors duration-200"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 text-[15px] font-semibold text-white bg-[var(--ap-primary)] hover:bg-[var(--ap-primary-hover)] rounded-xl transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,184,90,0.3)] active:scale-[0.97]"
              >
                Get started
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              ref={menuButton}
              type="button"
              className="lg:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--ap-surface)] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <div className="w-5 flex flex-col gap-[5px]">
                <span
                  className={`block h-[2px] bg-[var(--ap-foreground)] transition-all duration-300 ${
                    mobileOpen ? "rotate-45 translate-y-[7px]" : ""
                  }`}
                />
                <span
                  className={`block h-[2px] bg-[var(--ap-foreground)] transition-all duration-300 ${
                    mobileOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-[2px] bg-[var(--ap-foreground)] transition-all duration-300 ${
                    mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav panel */}
      <nav
        id="mobile-nav"
        hidden={!mobileOpen}
        className={`fixed top-[72px] left-0 right-0 z-40 bg-white border-b border-[var(--ap-border)] shadow-lg lg:hidden transition-all duration-300 ${
          mobileOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        aria-label="Mobile navigation"
      >
        <div className="max-w-[1320px] mx-auto px-5 py-4 flex flex-col gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleNavClick}
              className="px-4 py-3 text-base font-medium text-[var(--ap-foreground)] hover:bg-[var(--ap-mint)] rounded-xl transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link href="/login?demo=1" onClick={handleNavClick} className="px-4 py-3 text-base font-semibold text-[var(--ap-primary-dark)] rounded-xl hover:bg-[var(--ap-mint)]">Explore the demo</Link>
          <hr className="my-2 border-[var(--ap-border)]" />
          <Link
            href="/login"
            onClick={handleNavClick}
            className="px-4 py-3 text-base font-medium text-[var(--ap-muted)] hover:text-[var(--ap-foreground)] hover:bg-[var(--ap-surface)] rounded-xl transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            onClick={handleNavClick}
            className="mx-4 mt-1 mb-2 py-3 text-center text-base font-semibold text-white bg-[var(--ap-primary)] hover:bg-[var(--ap-primary-hover)] rounded-xl transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Spacer to offset sticky header */}
      <div className="h-[72px]" aria-hidden="true" />
    </>
  );
}
