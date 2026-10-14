import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-[#eafbf2] px-4 py-3 text-[#102c20]">
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">You’re exploring the demo workspace</p>
        <p className="mt-1 text-sm text-emerald-800">All five integrations show sample data. Explore brands, filters, and reports. Changes, payments, and messages are disabled. Sign out to create your own account.</p>
      </div>
    </div>
  );
}
