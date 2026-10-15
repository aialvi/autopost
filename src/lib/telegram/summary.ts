import { escapeHtml } from "./client";
export interface SummaryData {
  brandName: string; currency: string; date: string; startDate?: string;
  revenue: number; netProfit: number; orders: number; adSpend: number; roas: number;
  topCampaigns: Array<{ name: string; spend: number; roas: number }>;
}
export function formatSummary(data: SummaryData, weekly = false): string {
  const money = (value: number) => escapeHtml(new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(value));
  return `📊 <b>${weekly ? "Weekly" : "Daily"} Summary · ${escapeHtml(data.brandName)}</b>\n${escapeHtml(data.startDate && data.startDate !== data.date ? `${data.startDate} to ${data.date}` : data.date)}\n\n` +
    `Revenue after refunds: <b>${money(data.revenue)}</b>\nNet profit: <b>${money(data.netProfit)}</b>\nOrders: ${data.orders}\nAd spend: ${money(data.adSpend)}\nBlended ROAS: ${data.roas.toFixed(2)}x\n` +
    (data.topCampaigns.length ? `\n<b>Top campaigns by spend:</b>\n${data.topCampaigns.slice(0, 3).map((c, i) => `${i + 1}. ${escapeHtml(c.name.slice(0, 120))} · ${money(c.spend)} · ${c.roas.toFixed(2)}x platform ROAS`).join("\n")}` : "");
}
