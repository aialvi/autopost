import { auth } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo/config";
import { getUserBrands } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings } from "lucide-react";
import { SelectBrandButton } from "@/components/dashboard/select-brand-button";

export default async function BrandsPage() {
  const result = await getUserBrands();
  const demo = isDemoUser((await auth())?.user?.id);

  if (result.error || !result.brands || result.brands.length === 0) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>No Brands Found</CardTitle>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Manage your brands and settings
          </p>
        </div>
        {!demo && <Button asChild>
          <Link href="/dashboard/brands/new">Create Brand</Link>
        </Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {result.brands.map((brand) => (
          <Card key={brand.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>{brand.name}</CardTitle>
              <CardDescription>
                <span className="capitalize">{brand.userRole}</span> • {brand.slug}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Default COGS:</span>
                  <span>{brand.defaultCogsPercentage}%</span>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2">
                <SelectBrandButton brandId={brand.id} />
                <Button variant="outline" className="flex-1 px-2 text-xs" asChild>
                  <Link href={`/dashboard/brands/${brand.id}/shopify`}>Shopify &amp; Ads</Link>
                </Button>
                <Button variant="outline" size="icon" className="shrink-0" asChild>
                  <Link href={`/dashboard/brands/${brand.id}/settings`} aria-label="Settings" title={`${brand.name} settings`}>
                    <Settings aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
