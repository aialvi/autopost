import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasBrandAccess } from "@/lib/auth";
import { getBrand } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BrandDetailPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await hasBrandAccess(session.user.id, id);
  if (!role) {
    redirect("/dashboard");
  }

  const result = await getBrand(id);

  if (!result.brand) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Brand Not Found</CardTitle>
            <CardDescription>
              The brand you're looking for doesn't exist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/brands">Back to Brands</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { brand, userRole } = result;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
          <p className="text-muted-foreground capitalize">{userRole} access</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/brands/${brand.id}/settings`}>Settings</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">$0.00</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">$0.00</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">$0.00</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Slug</dt>
              <dd className="font-medium">{brand.slug}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Timezone</dt>
              <dd className="font-medium">{brand.timezone}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Currency</dt>
              <dd className="font-medium">{brand.currency}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Default COGS</dt>
              <dd className="font-medium">{brand.defaultCogsPercentage}%</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
