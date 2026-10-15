"use client";
import { useState } from "react";
import useSWR from "swr";
import { fetchJSON } from "@/lib/utils/fetch-json";
import type { CampaignReport } from "@/lib/platforms/ads/report";
import { PlatformBreakdown } from "./platform-breakdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export function CampaignReportView({ brandId, currency }: { brandId: string; currency: string }) {
  const [filters, setFilters] = useState(() => ({ startDate: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), platform: "all", page: "1" }));
  const { data, error, isLoading, mutate } = useSWR<CampaignReport>(`/api/brands/${brandId}/campaigns?${new URLSearchParams(filters)}`, fetchJSON);
  const money = (value: number | string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Start date<Input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value, page: "1" })} /></label>
      <label className="text-sm">End date<Input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value, page: "1" })} /></label>
      <div className="text-sm"><label htmlFor="campaign-platform">Platform</label><select id="campaign-platform" className="block h-9 rounded-md border bg-background px-3" value={filters.platform} onChange={e => setFilters({ ...filters, platform: e.target.value, page: "1" })}>{["all", "meta", "google", "tiktok", "snapchat"].map(p => <option key={p} value={p}>{p === "all" ? "All platforms" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></div>
      <Button variant="outline" onClick={() => mutate()}>Refresh</Button><Button asChild variant="outline"><Link href={`/dashboard/brands/${brandId}/settings`}>Connections & sync</Link></Button>
    </div>
    <p className="text-sm text-muted-foreground">ROAS uses each platform’s reported conversion revenue; attribution may overlap across platforms. Budgets are current campaign budgets. Edit campaigns and budgets in the ad platform. Missing or shared/ad-set budgets are shown as unavailable. Reports include only dates synced so far.</p>
    {isLoading && <p role="status">Loading campaigns…</p>}
    {error && <p role="alert">{error.message}</p>}
    {data && <>
      <PlatformBreakdown breakdown={data.breakdown} currency={currency} />
      <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><caption className="p-4 text-left font-medium">{data.total} campaigns · {filters.startDate} to {filters.endDate}</caption><thead className="bg-muted"><tr>{["Campaign", "Platform", "Status", "Budget", "Spend", "Revenue", "ROAS", "Impressions", "Clicks", "Conversions", "Synced days"].map(label => <th className="p-3 whitespace-nowrap" key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.campaigns.map(c => <tr className="border-t" key={c.id}><th scope="row" className="min-w-48 p-3 font-medium">{c.name}<span className="block text-xs font-normal text-muted-foreground">Updated {new Date(c.updatedAt).toLocaleDateString()}</span></th><td className="p-3 capitalize">{c.platform}</td><td className="p-3">{c.status}</td><td className="p-3 whitespace-nowrap">{c.dailyBudget !== null ? `${money(c.dailyBudget)}/day` : c.lifetimeBudget !== null ? `${money(c.lifetimeBudget)} lifetime` : "Unavailable"}</td><td className="p-3">{money(c.spend)}</td><td className="p-3">{money(c.revenue)}</td><td className="p-3">{c.spend ? `${c.roas.toFixed(2)}x` : "—"}</td><td className="p-3">{c.impressions.toLocaleString()}</td><td className="p-3">{c.clicks.toLocaleString()}</td><td className="p-3">{c.conversions.toLocaleString()}</td><td className="p-3">{c.syncedDays}</td></tr>)}</tbody></table>{!data.campaigns.length && <p className="p-5">No campaigns found. Connect and sync an ad account, or choose another platform.</p>}</div>
      <div className="flex items-center gap-3"><Button variant="outline" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: String(data.page - 1) })}>Previous</Button><span className="text-sm">Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><Button variant="outline" disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters({ ...filters, page: String(data.page + 1) })}>Next</Button></div>
    </>}
  </div>;
}
