"use client";

import Image from "next/image";

export function ShopifySyncPreview() {
  const products = [
    { name: "Classic Sneakers", sku: "CS-001", price: "$89.99", synced: true },
    { name: "Canvas Tote Bag", sku: "CTB-042", price: "$34.50", synced: true },
    { name: "Wireless Earbuds", sku: "WE-118", price: "$59.00", synced: true },
    { name: "Bamboo Water Bottle", sku: "BWB-007", price: "$24.99", synced: false },
  ];

  return (
    <div className="relative">
      {/* Photo background */}
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <Image
          src="/images/marketing/shopify-workspace.webp"
          alt="E-commerce workspace with laptop showing an online store"
          width={800}
          height={500}
          className="w-full h-[280px] sm:h-[360px] object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* Sync UI overlay */}
      <div
        className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[var(--ap-border)] overflow-hidden"
        aria-label="Shopify product sync preview — illustrative demo data"
        role="img"
      >
        <div className="px-4 py-3 border-b border-[var(--ap-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#95BF47] flex items-center justify-center">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
                <path d="M7 1.5L5 5.5l-2-4L1 6l3 5 3-5L5 2" fill="white" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[var(--ap-foreground)]">Product Sync</span>
          </div>
          <span className="text-[10px] font-medium text-[var(--ap-primary)] bg-[var(--ap-mint)] px-2 py-0.5 rounded-full">
            3 of 4 synced
          </span>
        </div>
        <div className="divide-y divide-[var(--ap-border)]">
          {products.map((product) => (
            <div key={product.sku} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 bg-[var(--ap-surface)] rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--ap-foreground)] truncate">{product.name}</div>
                <div className="text-[10px] text-[var(--ap-muted)]">{product.sku} · {product.price}</div>
              </div>
              {product.synced ? (
                <div className="w-5 h-5 rounded-full bg-[var(--ap-primary)]/10 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 5l2 2 4-4" stroke="var(--ap-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
