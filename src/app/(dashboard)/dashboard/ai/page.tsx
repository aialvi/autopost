import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AIInsights } from "./ai-insights";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AIInsightsPage({ searchParams }: PageProps) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">
            Anomaly detection, trends, and optimization recommendations
          </p>
        </div>
      </div>

      <AIInsights brandId={brandId} startDate={startDate} endDate={endDate} />
    </div>
  );
}
