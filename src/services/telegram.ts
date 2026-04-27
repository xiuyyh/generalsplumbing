/**
 * @fileOverview Service for interacting with the Telegram Bot API.
 */

const TELEGRAM_TOKEN = '8714326407:AAHIGnLwWrPO5Q5F5z7UVl-PLJMNUf6R2fM';
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export interface TelegramMessageOptions {
  chatId: string | number;
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

  // Ensure Chat ID is processed correctly. 
  // Numeric IDs should remain numeric in the JSON payload if possible, 
  // but Telegram accepts strings for both usernames and numeric IDs.
  const targetChatId = typeof chatId === 'string' ? chatId.trim() : chatId;

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

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Telegram API Error: ${result.description || response.statusText} (Code: ${result.error_code}, ID: ${targetChatId})`);
    }

    return result;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}
