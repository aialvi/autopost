"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">We couldn’t load this page</h1>
      <p className="mt-3 text-sm text-muted-foreground">Please try again. You can also return to your brands and choose another dashboard.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}><RefreshCw />Try again</Button>
        <Button variant="outline" asChild><Link href="/dashboard/brands">Back to brands</Link></Button>
      </div>
    </div>
  );
}
