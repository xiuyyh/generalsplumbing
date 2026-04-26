/**
 * @fileOverview Service for interacting with the Telegram Bot API.
 */

const TELEGRAM_TOKEN = '8714326407:AAHIGnLwWrPO5Q5F5z7UVl-PLJMNUf6R2fM';
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export interface TelegramMessageOptions {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
}

/**
 * Sends a text message via the Telegram Bot.
 */
export async function sendTelegramMessage({ chatId, text, parseMode = 'HTML' }: TelegramMessageOptions) {
  if (!chatId) {
    console.warn('Telegram Notification skipped: No Chat ID configured.');
    return null;
  }

  // Ensure Chat ID is a string and trimmed
  const targetChatId = chatId.trim();

  try {
    const response = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: parseMode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // Include the Chat ID in the error for easier debugging of "chat not found"
      throw new Error(`Telegram API Error: ${error.description || response.statusText} (ID: ${targetChatId})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}
