import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBrands } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DashboardOverviewClient } from "./dashboard-overview-client";
import { MultiBrandComparison } from "@/components/dashboard/multi-brand-comparison";

interface PageProps {
  searchParams: Promise<{
    compare?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const brandId = cookieStore.get("currentBrandId")?.value;

  const params = await searchParams;
  const compareIds = params.compare?.split(",");

  const result = await getUserBrands();

  if (result.error || !result.brands) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to AutoPost</CardTitle>
            <CardDescription>
              Create your first brand to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/brands/new">Create Brand</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no brand selected, show brand list
  if (!brandId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Select a brand to view its dashboard
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/brands/new">Create Brand</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.brands.map((brand) => (
            <Card key={brand.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{brand.name}</CardTitle>
                <CardDescription className="capitalize">
                  {brand.userRole}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timezone:</span>
                    <span>{brand.timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency:</span>
                    <span>{brand.currency}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard?brandId=${brand.id}`}>View Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Get current brand info
  const currentBrand = result.brands.find((b) => b.id === brandId);
  if (!currentBrand) {
    redirect("/dashboard/brands");
  }

  // Fetch dashboard data via API
  const dashboardResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/dashboard/${brandId}/overview`,
    { cache: "no-store" }
  );
  const dashboardData = await dashboardResponse.json();

  // Fetch multi-brand comparison if requested
  let comparisonData = null;
  if (compareIds && compareIds.length > 1) {
    const comparisonResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/dashboard/compare?brandIds=${compareIds.join(",")}`,
      { cache: "no-store" }
    );
    if (comparisonResponse.ok) {
      comparisonData = await comparisonResponse.json();
    }
  }

  return (
    <DashboardOverviewClient
      brandId={brandId}
      brandName={currentBrand.name}
      userRole={currentBrand.userRole}
      allBrands={result.brands}
      initialData={dashboardData}
      comparisonData={comparisonData}
    />
  );
}
