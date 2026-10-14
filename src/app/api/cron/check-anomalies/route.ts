import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/jobs/authorize";
import { runNotificationJob } from "@/lib/jobs/run";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: "Telegram is not configured" }, { status: 503 });
  try {
    const result = await runNotificationJob("check-anomalies");
    return NextResponse.json(result, { status: result.failed ? 500 : 200 });
  } catch (error) {
    console.error("Scheduled job failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Scheduled job failed" }, { status: 500 });
  }
}
