import { auth } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo/config";
import { redirect } from "next/navigation";
import { CreateBrandForm } from "@/components/dashboard/create-brand-form";

export default async function NewBrandPage() {
  if (isDemoUser((await auth())?.user?.id)) redirect("/dashboard/brands");
  return (
    <div className="max-w-md mx-auto">
      <CreateBrandForm />
    </div>
  );
}
