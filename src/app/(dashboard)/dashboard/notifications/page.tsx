import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBrands } from "@/lib/actions";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { NotificationHistory } from "@/components/notifications/notification-history";
import { getNotificationPreferences } from "@/lib/telegram/notifications";

export default async function NotificationsPage() {
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

  // Fetch notification preferences
  const preferences = await getNotificationPreferences(brandId, session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Notifications
        </h1>
        <p className="text-muted-foreground">
          Manage notification preferences for {currentBrand.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NotificationPreferences
            brandId={brandId}
            initialPreferences={preferences || undefined}
            isViewer={currentBrand.userRole === "viewer"}
          />
        </div>

        <div>
          <NotificationHistory brandId={brandId} />
        </div>
      </div>
    </div>
  );
}
