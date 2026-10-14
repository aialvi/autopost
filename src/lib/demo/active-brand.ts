import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { DEMO_BRAND_IDS, isDemoBrand, isDemoUser } from "./config";

export async function getActiveBrandId() {
  const session = await auth();
  const selected = (await cookies()).get("currentBrandId")?.value;
  if (isDemoUser(session?.user?.id)) {
    return selected && isDemoBrand(selected) ? selected : DEMO_BRAND_IDS[0];
  }
  // Never carry a demo selection into a real account.
  return selected && !isDemoBrand(selected) ? selected : undefined;
}
