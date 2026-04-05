import { getUserBrands } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your brands and track performance
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
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <div>{brand.timezone}</div>
                  <div>{brand.currency}</div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/brands/${brand.id}`}>View</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
