import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBrands } from "@/lib/actions";
import { SubscriptionCard } from "@/components/billing/subscription-card";
import { BillingOverview } from "@/components/billing/billing-overview";
import { getBrandSubscription } from "@/lib/payments/management";

export default async function BillingPage() {
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

  const subscription = await getBrandSubscription(brandId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing for {currentBrand.name}
        </p>
      </div>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Choose Your Plan</h2>
        <SubscriptionCard
          brandId={brandId}
          currentTier={subscription?.tier || "free"}
          userEmail={session.user.email || ""}
          isViewer={currentBrand.userRole === "viewer"}
        />
      </div>

      {/* Billing Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Billing Overview</h2>
        <BillingOverview brandId={brandId} />
      </div>
    </div>
  );
}
