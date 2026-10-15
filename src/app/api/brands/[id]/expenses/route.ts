import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, hasBrandAccess } from "@/lib/auth";
import { getDemoApiResponse } from "@/lib/demo/api";
import { db } from "@/lib/db";
import { customExpenses } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { expenseSchema } from "@/lib/validators/expense";

type Context = { params: Promise<{ id: string }> };
async function handle(req: Request, { params }: Context) {
  const session = await auth();
  const demo = getDemoApiResponse(session?.user?.id, req);
  if (demo) return demo;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  const role = await hasBrandAccess(session.user.id, id);
  if (!role || (req.method !== "GET" && role === "viewer")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (req.method === "GET") {
      return NextResponse.json({ expenses: await db.select().from(customExpenses).where(eq(customExpenses.brandId, id)).orderBy(desc(customExpenses.startDate), desc(customExpenses.id)) });
    }
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const expenseId = z.uuid().safeParse(body.id);
    if (req.method !== "POST" && !expenseId.success) return NextResponse.json({ error: "Invalid expense" }, { status: 400 });
    const where = and(eq(customExpenses.brandId, id), eq(customExpenses.id, expenseId.success ? expenseId.data : id));
    if (req.method === "DELETE") {
      const rows = await db.delete(customExpenses).where(where).returning({ id: customExpenses.id });
      return NextResponse.json(rows.length ? { success: true } : { error: "Expense not found" }, { status: rows.length ? 200 : 404 });
    }
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a name, positive amount, and valid date range." }, { status: 400 });
    const values = { ...parsed.data, amount: parsed.data.amount.toFixed(2), updatedAt: new Date() };
    const rows = req.method === "POST"
      ? await db.insert(customExpenses).values({ ...values, brandId: id }).returning()
      : await db.update(customExpenses).set(values).where(where).returning();
    return NextResponse.json(rows[0] ?? { error: "Expense not found" }, { status: rows.length ? (req.method === "POST" ? 201 : 200) : 404 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    console.error("Expense operation failed", error);
    return NextResponse.json({ error: "Unable to save or load expenses" }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
