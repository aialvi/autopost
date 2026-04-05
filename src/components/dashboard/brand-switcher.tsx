"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Brand {
  id: string;
  name: string;
  slug: string;
  userRole: string;
}

interface BrandSwitcherProps {
  currentBrandId?: string;
  brands?: Brand[];
}

export function BrandSwitcher({
  currentBrandId,
  brands: initialBrands,
}: BrandSwitcherProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>(initialBrands || []);
  const [open, setOpen] = useState(false);

  const currentBrand = brands.find((b) => b.id === currentBrandId);

  const handleBrandChange = (brandId: string) => {
    router.push(`/dashboard/brands/${brandId}`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-accent"
      >
        <span className="truncate max-w-[150px]">
          {currentBrand?.name || "Select Brand"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border rounded-md shadow-lg z-20">
            <div className="p-1">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandChange(brand.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    brand.id === currentBrandId
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="font-medium truncate">{brand.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {brand.userRole}
                  </div>
                </button>
              ))}
              <button
                onClick={() => router.push("/dashboard/brands/new")}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent/50 text-muted-foreground"
              >
                + Create new brand
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
