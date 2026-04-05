import { getUserBrands } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function BrandsPage() {
  const result = await getUserBrands();

  if (result.error || !result.brands) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Manage your brands and settings
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
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/dashboard/brands/${brand.id}`}>View</Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/dashboard/brands/${brand.id}/settings`}>Settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
