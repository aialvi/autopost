"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface BrandComparison {
  brandId: string;
  brandName: string;
  currency: string;
  metrics: { revenue: number; netProfit: number; adSpend: number; roas: number; profitMargin: number; orders: number };
}
export function MultiBrandComparison({ comparisons }: { comparisons: BrandComparison[] }) {
  const sameCurrency = new Set(comparisons.map(c => c.currency)).size === 1;
  const money = (amount: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  const totals = comparisons.reduce((sum, c) => ({ revenue: sum.revenue + c.metrics.revenue, netProfit: sum.netProfit + c.metrics.netProfit, adSpend: sum.adSpend + c.metrics.adSpend, orders: sum.orders + c.metrics.orders }), { revenue: 0, netProfit: 0, adSpend: 0, orders: 0 });
  return <Card><CardHeader><CardTitle>Brand Comparison</CardTitle></CardHeader><CardContent>
    {!comparisons.length ? <p>Select multiple brands to compare performance.</p> : <>
      {!sameCurrency && <p className="mb-4 text-sm text-muted-foreground">Brands use different currencies. Amounts are shown in each brand’s currency; combined monetary totals require currency conversion.</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{["Brand", "Revenue", "Net profit", "Ad spend", "Blended ROAS", "Margin", "Orders"].map(label => <th key={label} className="p-3 text-left whitespace-nowrap" scope="col">{label}</th>)}</tr></thead><tbody>{comparisons.map(c => <tr key={c.brandId} className="border-b"><th scope="row" className="p-3 text-left">{c.brandName} <span className="text-muted-foreground">({c.currency})</span></th><td className="p-3">{money(c.metrics.revenue, c.currency)}</td><td className="p-3">{money(c.metrics.netProfit, c.currency)}</td><td className="p-3">{money(c.metrics.adSpend, c.currency)}</td><td className="p-3">{c.metrics.adSpend ? `${c.metrics.roas.toFixed(2)}x` : "—"}</td><td className="p-3">{c.metrics.profitMargin.toFixed(1)}%</td><td className="p-3">{c.metrics.orders.toLocaleString()}</td></tr>)}</tbody></table></div>
      <div className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-4">{sameCurrency && <><div>Total revenue<p className="text-xl font-semibold">{money(totals.revenue, comparisons[0].currency)}</p></div><div>Total profit<p className="text-xl font-semibold">{money(totals.netProfit, comparisons[0].currency)}</p></div><div>Blended ROAS<p className="text-xl font-semibold">{totals.adSpend ? `${(totals.revenue / totals.adSpend).toFixed(2)}x` : "—"}</p></div></>}<div>Total orders<p className="text-xl font-semibold">{totals.orders.toLocaleString()}</p></div></div>
    </>}
  </CardContent></Card>;
}
