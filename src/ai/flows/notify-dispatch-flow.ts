'use server';
/**
 * @fileOverview Genkit Flow for sending Telegram notifications on inventory dispatch.
 * Includes support for bulk/batch dispatch notifications.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendTelegramMessage } from '@/services/telegram';

/**
 * Escapes characters that are reserved in HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DispatchDetailSchema = z.object({
  itemName: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  assignedTo: z.string(),
  purpose: z.string(),
  address: z.string(),
  notes: z.string().optional(),
  chatId: z.union([z.string(), z.number()]).describe('The Telegram Chat ID to send the notification to.'),
});

const BatchDispatchSchema = z.object({
  workerName: z.string(),
  category: z.string(),
  address: z.string(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    isAvailable: z.boolean(),
    note: z.string().optional()
  })),
  chatId: z.union([z.string(), z.number()]).describe('The Telegram Chat ID to send the notification to.'),
});

export type DispatchNotificationInput = z.infer<typeof DispatchDetailSchema>;
export type BatchDispatchNotificationInput = z.infer<typeof BatchDispatchSchema>;

/**
 * Tool for sending a single dispatch alert.
 */
const sendTelegramNotificationTool = ai.defineTool(
  {
    name: 'sendTelegramNotification',
    description: 'Sends a formatted dispatch alert to a Telegram chat.',
    inputSchema: DispatchDetailSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const message = `
📦 <b>INVENTORY DISPATCH ALERT</b>
────────────────────
<b>Item:</b> ${escapeHtml(input.itemName)}
<b>Quantity:</b> ${input.quantity} ${input.unit || 'units'}
<b>Technician:</b> ${escapeHtml(input.assignedTo)}
<b>Job Category:</b> ${escapeHtml(input.purpose)}
<b>Destination:</b> ${escapeHtml(input.address)}
${input.notes ? `<b>Notes:</b> ${escapeHtml(input.notes)}` : ''}
────────────────────
<i>Generals Plumbing Management System</i>
    `.trim();

    const result = await sendTelegramMessage({
      chatId: input.chatId,
      text: message,
    });

    return { success: !!result };
  }
);

/**
 * Tool for sending a bulk/batch dispatch alert.
 */
const sendBatchTelegramNotificationTool = ai.defineTool(
  {
    name: 'sendBatchTelegramNotification',
    description: 'Sends a bulk material fulfillment report to Telegram.',
    inputSchema: BatchDispatchSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const itemsList = input.items.map(item => {
      const icon = item.isAvailable ? '✅' : '❌';
      const notePart = item.note ? ` - <i>${escapeHtml(item.note)}</i>` : '';
      return `${icon} ${escapeHtml(item.name)} (x${item.quantity})${notePart}`;
    }).join('\n');

    const message = `
🛠️ <b>BATCH DISPATCH REPORT</b>
────────────────────
<b>Worker:</b> ${escapeHtml(input.workerName)}
<b>Phase:</b> ${escapeHtml(input.category)}
<b>Site:</b> ${escapeHtml(input.address)}

<b>Fulfillment Status:</b>
${itemsList}
────────────────────
<i>Generals Plumbing Dispatch Terminal</i>
    `.trim();

    const result = await sendTelegramMessage({
      chatId: input.chatId,
      text: message,
    });

    return { success: !!result };
  }
);

/**
 * Flow to notify about a single dispatch.
 */
export const notifyDispatchFlow = ai.defineFlow(
  {
    name: 'notifyDispatchFlow',
    inputSchema: DispatchDetailSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const result = await sendTelegramNotificationTool(input);
    return { success: result.success };
  }
);

/**
 * Flow to notify about a batch dispatch.
 */
export const notifyBatchDispatchFlow = ai.defineFlow(
  {
    name: 'notifyBatchDispatchFlow',
    inputSchema: BatchDispatchSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const result = await sendBatchTelegramNotificationTool(input);
    return { success: result.success };
  }
);

export async function notifyDispatch(input: DispatchNotificationInput) {
  return notifyDispatchFlow(input);
}

export async function notifyBatchDispatch(input: BatchDispatchNotificationInput) {
  return notifyBatchDispatchFlow(input);
}
