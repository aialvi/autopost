import { NextRequest, NextResponse } from "next/server";

/**
 * Telegram Webhook Endpoint
 * Receives updates from Telegram Bot API
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify the request is from Telegram (optional, recommended)
    // Telegram doesn't sign webhooks, so we verify by checking the secret token
    const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (
      secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET &&
      process.env.NODE_ENV === "production"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process the update
    const update = body;

    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing Telegram webhook:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;

  // Handle commands
  if (text === "/start") {
    await sendWelcomeMessage(chatId);
  } else if (text === "/help") {
    await sendHelpMessage(chatId);
  } else if (text === "/status") {
    await sendStatusMessage(chatId);
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  // Handle button clicks
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  // Process the callback
  // ...
}

async function sendWelcomeMessage(chatId: number) {
  const { sendMessage } = await import("@/lib/telegram/client");

  await sendMessage({
    chatId: chatId.toString(),
    text: `👋 Welcome to AutoPost Bot!

I'll send you important notifications about your ad campaigns and orders.

Available commands:
/start - Show this message
/help - Show help information
/status - Check your notification status

To connect this chat to your brand, use the chat ID below in your brand settings:

<b>${chatId}</b>`,
  });
}

async function sendHelpMessage(chatId: number) {
  const { sendMessage } = await import("@/lib/telegram/client");

  await sendMessage({
    chatId: chatId.toString(),
    text: `📖 <b>AutoPost Bot Help</b>

<b>Commands:</b>
/start - Start the bot and get your chat ID
/help - Show this help message
/status - Check notification status

<b>Notifications you'll receive:</b>
🔔 Low ROAS alerts
💸 Spend spike warnings
📉 Revenue drop alerts
🛒 New order notifications
📊 Daily and weekly summaries

<b>Setup:</b>
1. Start a chat with this bot
2. Copy your chat ID from /start
3. Paste it in your brand's notification settings`,
  });
}

async function sendStatusMessage(chatId: number) {
  const { sendMessage } = await import("@/lib/telegram/client");

  await sendMessage({
    chatId: chatId.toString(),
    text: `✅ <b>Bot Status</b>

The AutoPost bot is running normally!
Your chat ID: <code>${chatId}</code>

If you're not receiving notifications, make sure:
1. You've added your chat ID in brand settings
2. Notifications are enabled for your brand
3. You're not in quiet hours`,
  });
}

// Keep webhook active (Telegram requires 200 OK response)
export async function GET() {
  return NextResponse.json({ status: "webhook_active" });
}
