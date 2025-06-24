'use server';

/**
 * @fileOverview This file defines a Genkit flow for starting a new conversation with AI suggestions.
 *
 * It takes a topic or question as input and suggests a relevant title and initial setup (e.g., pre-selected personas).
 *
 * @interface ConversationStarterInput - The input type for the conversation starter flow.
 * @interface ConversationStarterOutput - The output type for the conversation starter flow, including the suggested title.
 * @function conversationStarter - The main function to start a new conversation with AI suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationStarterInputSchema = z.object({
  topic: z.string().describe('The topic or question to start a conversation about.'),
});
export type ConversationStarterInput = z.infer<typeof ConversationStarterInputSchema>;

const ConversationStarterOutputSchema = z.object({
  suggestedTitle: z.string().describe('A suggested title for the conversation.'),
});
export type ConversationStarterOutput = z.infer<typeof ConversationStarterOutputSchema>;

export async function conversationStarter(input: ConversationStarterInput): Promise<ConversationStarterOutput> {
  return conversationStarterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationStarterPrompt',
  input: {schema: ConversationStarterInputSchema},
  output: {schema: ConversationStarterOutputSchema},
  prompt: `You are an AI assistant helping users start new conversations.
  The user has provided the following topic or question: {{{topic}}}.
  Suggest a relevant and engaging title for this conversation.
  The title should be concise and capture the essence of the topic.
  Return ONLY the title.`,
});

const conversationStarterFlow = ai.defineFlow(
  {
    name: 'conversationStarterFlow',
    inputSchema: ConversationStarterInputSchema,
    outputSchema: ConversationStarterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
