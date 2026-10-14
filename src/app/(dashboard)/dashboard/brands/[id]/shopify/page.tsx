import { auth, hasBrandAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShopifyWorkspaceView } from "@/components/dashboard/shopify-workspace";

export default async function ShopifyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const role = await hasBrandAccess(session.user.id, id);
  if (!role) redirect("/dashboard");
  return <ShopifyWorkspaceView brandId={id} canEdit={role !== "viewer"} />;
}
