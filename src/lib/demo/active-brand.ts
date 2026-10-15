import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { hasBrandAccess } from "@/lib/auth/brand-auth";
import { auth } from "@/lib/auth";
import { DEMO_BRAND_IDS, isDemoBrand, isDemoUser } from "./config";

export async function getActiveBrandId(requestedId?: string) {
  const session = await auth();
  if (requestedId) {
    return session?.user?.id && z.uuid().safeParse(requestedId).success && await hasBrandAccess(session.user.id, requestedId) ? requestedId : undefined;
  }
  const selected = (await cookies()).get("currentBrandId")?.value;
  if (isDemoUser(session?.user?.id)) {
    return selected && isDemoBrand(selected) ? selected : DEMO_BRAND_IDS[0];
  }
  // Never carry a demo selection into a real account.
  return session?.user?.id && selected && z.uuid().safeParse(selected).success && !isDemoBrand(selected) && await hasBrandAccess(session.user.id, selected) ? selected : undefined;
}
