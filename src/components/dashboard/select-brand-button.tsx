"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setCurrentBrand } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function SelectBrandButton({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function select() {
    setPending(true);
    setError(false);
    try {
      const result = await setCurrentBrand(brandId);
      if (result.error) throw new Error(result.error);
      router.push("/dashboard");
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <Button className="w-full px-2 text-xs" onClick={select} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Opening…" : "Dashboard"}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">Could not open brand. Try again.</p>}
    </div>
  );
}
