import { getUserBrands } from "@/lib/actions";
import { getActiveBrandId } from "@/lib/demo/active-brand";
import { redirect } from "next/navigation";
import { AIInsights } from "./ai-insights";

interface PageProps {
  searchParams: Promise<{
    brandId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AIInsightsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const brandId = await getActiveBrandId(params.brandId);

  if (!brandId) {
    redirect("/dashboard/brands");
  }

  const brand = (await getUserBrands()).brands?.find(brand => brand.id === brandId);
  if (!brand) redirect("/dashboard/brands");
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 29);

  const startDate = params.startDate || defaultStartDate.toISOString().split("T")[0];
  const endDate = params.endDate || defaultEndDate.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">
            {brand.name} · Anomaly detection, trends, and recommendations
          </p>
        </div>
      </div>

      <AIInsights currency={brand.currency} brandId={brandId} startDate={startDate} endDate={endDate} />
    </div>
  );
}
