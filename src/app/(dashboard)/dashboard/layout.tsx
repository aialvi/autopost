import { isDemoUser } from "@/lib/demo/config";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrandSwitcher } from "@/components/dashboard/brand-switcher";
import { getUserBrands } from "@/lib/actions";
import { getActiveBrandId } from "@/lib/demo/active-brand";
import { AutoPostLogo } from "@/components/ui/autopost-logo";
import { LogOut } from "lucide-react";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getUserBrands();
  const demo = isDemoUser(session.user.id);

  const currentBrandId = await getActiveBrandId();

  return (
    <div className="dashboard-shell min-h-screen bg-[#f6faf7]">
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-[#102c20] px-4 py-3 text-white focus:not-sr-only">Skip to content</a>
      <header className="bg-white/95 backdrop-blur-sm border-b border-[#dfeae3] shadow-[0_1px_8px_rgba(16,44,32,0.03)] sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <AutoPostLogo href="/dashboard" />
            <BrandSwitcher brands={result.brands || []} currentBrandId={currentBrandId} readOnly={demo} />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:block">
              {session.user.email}
            </span>
            <form action={async () => {
              "use server";
              const { cookies } = await import("next/headers");
              (await cookies()).delete("currentBrandId");
              await signOut({ redirectTo: "/login" });
            }}>
              <button
                type="submit"
                aria-label="Sign out"
                className="rounded-lg px-3 py-2 text-sm text-[#476153] hover:bg-[#eafbf2] hover:text-[#102c20]"
              >
                <LogOut className="h-4 w-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl border-t border-[#eef4f0]"><DashboardNav /></div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl p-4 outline-none sm:p-6 lg:p-8">
        {demo && <DemoBanner />}
        {result.error ? (
          <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">We couldn’t load your brands. Please refresh to try again.</div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
