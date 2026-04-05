import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasBrandAccess, canEditBrand } from "@/lib/auth";
import { getBrand } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BrandSettingsPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await hasBrandAccess(session.user.id, id);
  if (!role) {
    redirect("/dashboard");
  }

  const canEdit = await canEditBrand(session.user.id, id);
  const result = await getBrand(id);

  if (!result.brand) {
    redirect("/dashboard/brands");
  }

  const { brand } = result;

  async function updateBrand(formData: FormData) {
    "use server";
    const { updateBrand } = await import("@/lib/actions");
    await updateBrand(id, formData);
  }

  async function deleteBrand() {
    "use server";
    const { deleteBrand } = await import("@/lib/actions");
    await deleteBrand(id);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brand Settings</h1>
          <p className="text-muted-foreground">{brand.name}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/brands/${id}`}>Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand Information</CardTitle>
          <CardDescription>
            Update your brand settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateBrand} className="space-y-4">
            <div>
              <Label htmlFor="name">Brand Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={brand.name}
                required
                minLength={2}
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={brand.timezone}
                disabled={!canEdit}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Central European (CET)</option>
                <option value="Asia/Tokyo">Japan (JST)</option>
                <option value="Australia/Sydney">Sydney (AEDT)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={brand.currency}
                disabled={!canEdit}
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>

            <div>
              <Label htmlFor="defaultCogsPercentage">
                Default COGS Percentage
              </Label>
              <Input
                id="defaultCogsPercentage"
                name="defaultCogsPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={brand.defaultCogsPercentage}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used when product cost is not available
              </p>
            </div>

            {canEdit && (
              <div className="flex gap-2">
                <Button type="submit">Save Changes</Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {role === "owner" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for this brand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deleteBrand}>
              <Button type="submit" variant="destructive">
                Delete Brand
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
