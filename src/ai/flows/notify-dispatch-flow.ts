'use server';
/**
 * @fileOverview Genkit Flow for sending Telegram notifications on inventory dispatch.
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

export type DispatchNotificationInput = z.infer<typeof DispatchDetailSchema>;

/**
 * Tool for sending the Telegram notification.
 */
const sendTelegramNotificationTool = ai.defineTool(
  {
    name: 'sendTelegramNotification',
    description: 'Sends a formatted dispatch alert to a Telegram chat.',
    inputSchema: DispatchDetailSchema,
    outputSchema: z.object({ success: z.boolean(), messageId: z.any() }),
  },
  async (input) => {
    // Escape variables to prevent HTML parsing errors in Telegram
    const escapedItem = escapeHtml(input.itemName);
    const escapedTech = escapeHtml(input.assignedTo);
    const escapedPurpose = escapeHtml(input.purpose);
    const escapedAddress = escapeHtml(input.address);
    const escapedNotes = input.notes ? escapeHtml(input.notes) : '';
    const unit = input.unit ? escapeHtml(input.unit) : 'units';

    const message = `
📦 <b>INVENTORY DISPATCH ALERT</b>
────────────────────
<b>Item:</b> ${escapedItem}
<b>Quantity:</b> ${input.quantity} ${unit}
<b>Technician:</b> ${escapedTech}
<b>Job Category:</b> ${escapedPurpose}
<b>Destination:</b> ${escapedAddress}
${escapedNotes ? `<b>Notes:</b> ${escapedNotes}` : ''}
────────────────────
<i>Generals Plumbing Management System</i>
    `.trim();

    const result = await sendTelegramMessage({
      chatId: input.chatId,
      text: message,
    });

    return { success: !!result, messageId: result?.result?.message_id };
  }
);

/**
 * Flow to notify about a dispatch.
 */
const notifyDispatchFlow = ai.defineFlow(
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

export async function notifyDispatch(input: DispatchNotificationInput) {
  return notifyDispatchFlow(input);
}
