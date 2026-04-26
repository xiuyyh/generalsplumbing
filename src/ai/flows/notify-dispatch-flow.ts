'use server';
/**
 * @fileOverview Genkit Flow for sending Telegram notifications on inventory dispatch.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendTelegramMessage } from '@/services/telegram';

const DispatchDetailSchema = z.object({
  itemName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  assignedTo: z.string(),
  purpose: z.string(),
  address: z.string(),
  notes: z.string().optional(),
  chatId: z.string().describe('The Telegram Chat ID to send the notification to.'),
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
    const message = `
📦 <b>INVENTORY DISPATCH ALERT</b>
────────────────────
<b>Item:</b> ${input.itemName}
<b>Quantity:</b> ${input.quantity} ${input.unit}
<b>Technician:</b> ${input.assignedTo}
<b>Job Reference:</b> ${input.purpose}
<b>Destination:</b> ${input.address}
${input.notes ? `<b>Notes:</b> ${input.notes}` : ''}
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
    const { output } = await ai.generate({
      prompt: `Send a telegram notification for the dispatch of ${input.itemName}.`,
      tools: [sendTelegramNotificationTool],
      config: {
        // Pass the input directly to ensure the tool gets the right data
      }
    });
    
    // In a real flow, we might use LLM to summarize, 
    // but for strict notification we call the tool directly or via generation.
    // For this prototype, we'll ensure the notification is sent.
    const result = await sendTelegramNotificationTool(input);
    return { success: result.success };
  }
);

export async function notifyDispatch(input: DispatchNotificationInput) {
  return notifyDispatchFlow(input);
}
