import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBrands } from "@/lib/actions";
import { AttributionBreakdown } from "@/components/attribution/attribution-breakdown";
import { CAPIEventsList } from "@/components/capi/capi-events-list";

export default async function AttributionPage() {
  const cookieStore = await cookies();
  const brandId = cookieStore.get("currentBrandId")?.value;

  if (!brandId) {
    redirect("/dashboard");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/dashboard");
  }

  const result = await getUserBrands();
  if (result.error || !result.brands) {
    redirect("/dashboard");
  }

  const currentBrand = result.brands.find((b) => b.id === brandId);
  if (!currentBrand) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Attribution & CAPI
        </h1>
        <p className="text-muted-foreground">
          Track conversions and manage Conversion API events for {currentBrand.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AttributionBreakdown brandId={brandId} />
        </div>
        <div className="lg:col-span-2">
          <CAPIEventsList brandId={brandId} />
        </div>
      </div>
    </div>
  );
}
