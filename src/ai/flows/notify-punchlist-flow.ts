
'use server';
/**
 * @fileOverview Genkit Flow for sending Telegram notifications for overdue Punch List items.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendTelegramMessage } from '@/services/telegram';

const PunchListAlertSchema = z.object({
  description: z.string(),
  address: z.string(),
  dueDate: z.string(),
  daysOverdue: z.number(),
  chatId: z.string().describe('The Telegram Chat ID to send the notification to.'),
});

export type PunchListAlertInput = z.infer<typeof PunchListAlertSchema>;

const sendPunchAlertTool = ai.defineTool(
  {
    name: 'sendPunchAlert',
    description: 'Sends a formatted overdue punch list alert to Telegram.',
    inputSchema: PunchListAlertSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const message = `
⚠️ <b>URGENT: OVERDUE PUNCH TASK</b>
────────────────────
<b>Task:</b> ${input.description}
<b>Address:</b> ${input.address}
<b>Due Date:</b> ${new Date(input.dueDate).toLocaleDateString()}
<b>Status:</b> ${input.daysOverdue} Days Past Due
────────────────────
<i>Generals Plumbing Site Management</i>
    `.trim();

    const result = await sendTelegramMessage({
      chatId: input.chatId,
      text: message,
    });

    return { success: !!result };
  }
);

const notifyPunchListFlow = ai.defineFlow(
  {
    name: 'notifyPunchListFlow',
    inputSchema: PunchListAlertSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    const result = await sendPunchAlertTool(input);
    return { success: result.success };
  }
);

export async function notifyPunchOverdue(input: PunchListAlertInput) {
  return notifyPunchListFlow(input);
}
