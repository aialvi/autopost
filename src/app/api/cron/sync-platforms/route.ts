import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/jobs/authorize";
import { runSyncJob } from "@/lib/jobs/run";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runSyncJob(new URL(request.url).searchParams.get("platform") ?? undefined);
    return NextResponse.json(result, { status: result.failed ? 500 : 200 });
  } catch (error) {
    console.error("Scheduled job failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Scheduled job failed" }, { status: 500 });
  }
}
