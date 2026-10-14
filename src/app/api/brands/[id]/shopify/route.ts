import { NextResponse } from "next/server";
import { auth, hasBrandAccess } from "@/lib/auth";
import { getDemoApiResponse } from "@/lib/demo/api";
import { getShopifyWorkspace, type StoreTab } from "@/lib/platforms/shopify/workspace";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const demo = getDemoApiResponse(session?.user?.id, request);
  if (demo) return demo;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!await hasBrandAccess(session.user.id, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") ?? "products";
  const page = Number(url.searchParams.get("page") ?? 1);
  if (!["products", "orders", "ads"].includes(tab) || !Number.isSafeInteger(page) || page < 1 || page > 10000) return NextResponse.json({ error: "Invalid page or tab" }, { status: 400 });
  try {
    return NextResponse.json(await getShopifyWorkspace(id, tab as StoreTab, page), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load your Shopify workspace. Please retry." }, { status: 500 });
  }
}
