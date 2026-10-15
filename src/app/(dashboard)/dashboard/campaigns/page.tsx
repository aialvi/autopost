import { getActiveBrandId } from "@/lib/demo/active-brand";
import { getUserBrands } from "@/lib/actions";
import { redirect } from "next/navigation";
import { CampaignReportView } from "@/components/dashboard/campaign-report";
export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ brandId?: string }> }) {
  const brandId = await getActiveBrandId((await searchParams).brandId);
  const result = await getUserBrands();
  const brand = result.brands?.find(brand => brand.id === brandId);
  if (!brand) redirect("/dashboard/brands");
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Campaigns</h1><p className="text-muted-foreground">{brand.name} · Campaign performance across connected ad accounts</p></div><CampaignReportView key={brand.id} brandId={brand.id} currency={brand.currency} /></div>;
}
