export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <span className="sr-only">Loading dashboard…</span>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-neutral-200" />
        <div className="h-4 w-64 max-w-full rounded bg-neutral-200" />
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 motion-safe:animate-pulse">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-xl border bg-white p-6"><div className="h-4 w-24 rounded bg-neutral-100" /><div className="mt-4 h-8 w-32 rounded bg-neutral-100" /></div>)}
      </div>
      <div aria-hidden="true" className="h-56 rounded-xl border bg-white motion-safe:animate-pulse" />
    </div>
  );
}
