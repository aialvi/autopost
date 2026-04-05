/**
 * Telegram Bot API Client
 * Handles sending messages and managing Telegram bot interactions
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = "https://api.telegram.org";

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  disableNotification?: boolean;
  replyMarkup?: InlineKeyboardMarkup;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendMessage(
  message: TelegramMessage
): Promise<TelegramResponse> {
  if (!TELEGRAM_BOT_TOKEN) {
    return {
      ok: false,
      description: "Telegram bot token not configured",
    };
  }

  try {
    const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const payload = {
      chat_id: message.chatId,
      text: message.text,
      parse_mode: message.parseMode || "HTML",
      disable_notification: message.disableNotification || false,
      reply_markup: message.replyMarkup,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return data;
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Set up a webhook for the bot
 */
export async function setWebhook(webhookUrl: string): Promise<TelegramResponse> {
  if (!TELEGRAM_BOT_TOKEN) {
    return {
      ok: false,
      description: "Telegram bot token not configured",
    };
  }

  try {
    const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
      }),
    });

    const data = await response.json();

    return data;
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get bot information
 */
export async function getBotInfo(): Promise<TelegramResponse> {
  if (!TELEGRAM_BOT_TOKEN) {
    return {
      ok: false,
      description: "Telegram bot token not configured",
    };
  }

  try {
    const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/getMe`;

    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    return {
      ok: false,
      description: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate a chat ID by sending a test message
 */
export async function validateChatId(chatId: string): Promise<boolean> {
  const result = await sendMessage({
    chatId,
    text: "🔔 AutoPost notifications enabled! You'll receive alerts here.",
  });

  return result.ok;
}

/**
 * Format message with HTML and escape special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Create a keyboard with action buttons
 */
export function createKeyboard(
  buttons: Array<{ text: string; url?: string; callback_data?: string }>
): InlineKeyboardMarkup {
  return {
    inline_keyboard: buttons.map((button) => [button]),
  };
}
