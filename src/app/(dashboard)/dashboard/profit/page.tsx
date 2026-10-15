import { getUserBrands } from "@/lib/actions";
import { getActiveBrandId } from "@/lib/demo/active-brand";
import { redirect } from "next/navigation";
import { ProfitOverview } from "./profit-overview";

interface PageProps {
  searchParams: Promise<{
    brandId?: string;
    startDate?: string;
    endDate?: string;
    granularity?: string;
  }>;
}

export default async function ProfitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const brandId = await getActiveBrandId(params.brandId);

  if (!brandId) {
    redirect("/dashboard/brands");
  }

  const result = await getUserBrands();
  const brand = result.brands?.find((brand) => brand.id === brandId);
  if (!brand) redirect("/dashboard/brands");
  const currency = brand.currency;
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 29);

  const startDate = params.startDate || defaultStartDate.toISOString().split("T")[0];
  const endDate = params.endDate || defaultEndDate.toISOString().split("T")[0];
  const granularity = params.granularity || "daily";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profit Analytics</h1>
          <p className="text-muted-foreground">
            {brand.name} · Revenue, costs, and profit
          </p>
        </div>
      </div>

      <ProfitOverview
        brandId={brandId}
        canEdit={brand.userRole !== "viewer"}
        currency={currency}
        startDate={startDate}
        endDate={endDate}
        granularity={granularity}
      />
    </div>
  );
}
