'use server';

/**
 * @fileOverview Summarizes long conversation threads to quickly catch up on the discussion.
 *
 * - summarizeMessages - A function that summarizes a list of messages.
 * - SummarizeMessagesInput - The input type for the summarizeMessages function.
 * - SummarizeMessagesOutput - The return type for the summarizeMessages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeMessagesInputSchema = z.object({
  messages: z.array(z.string()).describe('A list of messages to summarize.'),
});
export type SummarizeMessagesInput = z.infer<typeof SummarizeMessagesInputSchema>;

const SummarizeMessagesOutputSchema = z.object({
  summary: z.string().describe('A summary of the conversation thread.'),
});
export type SummarizeMessagesOutput = z.infer<typeof SummarizeMessagesOutputSchema>;

export async function summarizeMessages(input: SummarizeMessagesInput): Promise<SummarizeMessagesOutput> {
  return summarizeMessagesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeMessagesPrompt',
  input: {schema: SummarizeMessagesInputSchema},
  output: {schema: SummarizeMessagesOutputSchema},
  prompt: `Summarize the following conversation thread:\n\n{{#each messages}}{{{this}}}\n{{/each}}\n\nSummary:`, 
});

const summarizeMessagesFlow = ai.defineFlow(
  {
    name: 'summarizeMessagesFlow',
    inputSchema: SummarizeMessagesInputSchema,
    outputSchema: SummarizeMessagesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
