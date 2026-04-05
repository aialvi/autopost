import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrandSwitcher } from "@/components/dashboard/brand-switcher";
import { getUserBrands } from "@/lib/actions";

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

  if (result.error || !result.brands) {
    // If user has no brands, redirect to create brand page
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Welcome to AutoPost</h1>
          <p className="text-muted-foreground mb-6">
            Create your first brand to get started
          </p>
          <a
            href="/dashboard/brands/new"
            className="inline-block bg-neutral-900 text-white px-6 py-2 rounded-md hover:bg-neutral-800"
          >
            Create Brand
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">AutoPost</h1>
            <BrandSwitcher brands={result.brands} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
