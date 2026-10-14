"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { setCurrentBrand } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Brand {
  id: string;
  name: string;
  slug: string;
  userRole: string;
}

export function BrandSwitcher({
  currentBrandId,
  brands = [],
  readOnly = false,
}: {
  currentBrandId?: string;
  brands?: Brand[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentBrand = brands.find((brand) => brand.id === currentBrandId);

  async function selectBrand(brandId: string) {
    setPending(true);
    setError(null);
    try {
      const result = await setCurrentBrand(brandId);
      if (result.error) throw new Error(result.error);
      router.push("/dashboard");
    } catch {
      setError("Could not switch brands. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-w-0">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" disabled={pending} aria-label={`Switch brand: ${currentBrand?.name || "none selected"}`}>
            <span className="max-w-28 truncate sm:max-w-44">
              {pending ? "Switching…" : currentBrand?.name || "Select a brand"}
            </span>
            {pending ? <Loader2 className="animate-spin" /> : <ChevronDown />}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={8} className="z-50 w-64 max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg">
            <DropdownMenu.Label className="px-3 py-2 text-xs font-medium text-muted-foreground">Your brands</DropdownMenu.Label>
            {brands.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Create a brand to get started.</p>}
            {brands.map((brand) => (
              <DropdownMenu.Item key={brand.id} onSelect={() => selectBrand(brand.id)} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 outline-none data-[highlighted]:bg-accent">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{brand.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{brand.userRole}</p>
                </div>
                {brand.id === currentBrandId && <Check className="h-4 w-4" aria-label="Selected" />}
              </DropdownMenu.Item>
            ))}
            {!readOnly && <>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item asChild>
              <Link href="/dashboard/brands/new" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-accent"><Plus className="h-4 w-4" />Create new brand</Link>
            </DropdownMenu.Item>
            </>}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {error && <p role="alert" className="absolute left-0 top-full z-40 mt-2 w-64 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
