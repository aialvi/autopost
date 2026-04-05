import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfitOverview } from "./profit-overview";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    granularity?: string;
  }>;
}

export default async function ProfitPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const brandId = cookieStore.get("currentBrandId")?.value;

  if (!brandId) {
    redirect("/dashboard/brands");
  }

  const params = await searchParams;
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const startDate = params.startDate || defaultStartDate.toISOString().split("T")[0];
  const endDate = params.endDate || defaultEndDate.toISOString().split("T")[0];
  const granularity = params.granularity || "daily";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profit Analytics</h1>
          <p className="text-muted-foreground">
            Track your revenue, costs, and profit metrics
          </p>
        </div>
      </div>

      <ProfitOverview
        brandId={brandId}
        startDate={startDate}
        endDate={endDate}
        granularity={granularity}
      />
    </div>
  );
}
