import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBotInfo } from "@/lib/telegram/client";

/**
 * GET - Get bot information
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botInfo = await getBotInfo();

  if (botInfo.ok) {
    return NextResponse.json({
      ok: true,
      bot: {
        id: botInfo.result.id,
        username: botInfo.result.username,
        firstName: botInfo.result.first_name,
      },
    });
  } else {
    return NextResponse.json(
      { error: botInfo.description || "Failed to get bot info" },
      { status: 500 }
    );
  }
}
