
'use server';
/**
 * @fileOverview Genkit Flow for sending Telegram notifications for Punch List items.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendTelegramMessage } from '@/services/telegram';

const PunchListAlertSchema = z.object({
  description: z.string(),
  address: z.string(),
  dueDate: z.string(),
  daysOverdue: z.number().optional(),
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
    const isNew = input.daysOverdue === undefined;
    const title = isNew ? '🆕 NEW PUNCH TASK' : '⚠️ URGENT: OVERDUE PUNCH TASK';
    const statusText = isNew ? 'Awaiting Action' : `${input.daysOverdue} Days Past Due`;

    const message = `
${title}
────────────────────
<b>Task:</b> ${input.description}
<b>Address:</b> ${input.address}
<b>Due Date:</b> ${new Date(input.dueDate).toLocaleDateString()}
<b>Status:</b> ${statusText}
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

export async function notifyNewPunchTask(input: Omit<PunchListAlertInput, 'daysOverdue'>) {
  return notifyPunchListFlow(input);
}
