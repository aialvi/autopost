import { auth } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo/config";
import { getDemoOverview, getDemoComparison } from "@/lib/demo/data";
import { getActiveBrandId } from "@/lib/demo/active-brand";
import { redirect } from "next/navigation";
import { getUserBrands } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DashboardOverviewClient } from "./dashboard-overview-client";
import { getDashboardOverview, getMultiBrandComparison } from "@/lib/dashboard/overview";
import { SelectBrandButton } from "@/components/dashboard/select-brand-button";

interface PageProps {
  searchParams: Promise<{
    brandId?: string;
    compare?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const brandId = await getActiveBrandId(params.brandId);

  const compareIds = params.compare?.split(",");

  const result = await getUserBrands();

  if (result.error || !result.brands || result.brands.length === 0) {
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
  if (!brandId || !result.brands.some((brand) => brand.id === brandId)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
                  <SelectBrandButton brandId={brand.id} />
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

  const demo = isDemoUser((await auth())?.user?.id);
  const dashboardData = demo ? getDemoOverview(brandId) : await getDashboardOverview(brandId);

  // Compare only brands the current user is allowed to access.
  const allowedIds = new Set(result.brands.map((brand) => brand.id));
  const selectedIds = [...new Set(compareIds)].filter((id) => allowedIds.has(id)).slice(0, 5);
  let comparisonData = null;
  if (selectedIds.length > 1) {
    const now = new Date();
    const endDate = now.toISOString().split("T")[0];
    const startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    comparisonData = { comparisons: demo ? getDemoComparison(selectedIds) : await getMultiBrandComparison(selectedIds, { startDate, endDate }) };
  }

  return (
    <DashboardOverviewClient
      key={brandId}
      brandId={brandId}
      brandName={currentBrand.name}
      userRole={currentBrand.userRole}
      currency={currentBrand.currency}
      allBrands={result.brands}
      initialData={dashboardData}
      comparisonData={comparisonData}
    />
  );
}
