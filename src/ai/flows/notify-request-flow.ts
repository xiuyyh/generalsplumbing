'use server';
/**
 * @fileOverview Genkit Flow for sending Telegram notifications when a worker requests materials.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendTelegramMessage } from '@/services/telegram';

const MaterialRequestAlertSchema = z.object({
  workerName: z.string(),
  itemName: z.string(),
  quantity: z.number(),
  category: z.string(),
  address: z.string(),
  chatId: z.string().describe('The Telegram Chat ID to send the notification to.'),
});

export type MaterialRequestAlertInput = z.infer<typeof MaterialRequestAlertSchema>;

const sendRequestAlertTool = ai.defineTool(
  {
    name: 'sendRequestAlert',
    description: 'Sends a formatted material request alert to Telegram.',
    inputSchema: MaterialRequestAlertSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const message = `
🛠️ <b>NEW MATERIAL REQUEST</b>
────────────────────
<b>Worker:</b> ${input.workerName}
<b>Item:</b> ${input.itemName}
<b>Qty:</b> ${input.quantity}
<b>Phase:</b> ${input.category}
<b>Site:</b> ${input.address}
────────────────────
<i>Pending authorization in Dispatch Terminal</i>
    `.trim();

    const result = await sendTelegramMessage({
      chatId: input.chatId,
      text: message,
    });

    return { success: !!result };
  }
);

const notifyRequestFlow = ai.defineFlow(
  {
    name: 'notifyRequestFlow',
    inputSchema: MaterialRequestAlertSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const result = await sendRequestAlertTool(input);
    return { success: result.success };
  }
);

export async function notifyNewRequest(input: MaterialRequestAlertInput) {
  return notifyRequestFlow(input);
}
