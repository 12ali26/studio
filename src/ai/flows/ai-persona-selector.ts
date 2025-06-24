'use server';

/**
 * @fileOverview A flow to suggest relevant AI personas based on the conversation topic.
 *
 * - suggestAIPersonas - A function that suggests AI personas based on the input topic.
 * - SuggestAIPersonasInput - The input type for the suggestAIPersonas function.
 * - SuggestAIPersonasOutput - The return type for the suggestAIPersonas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAIPersonasInputSchema = z.object({
  topic: z.string().describe('The conversation topic or question.'),
});
export type SuggestAIPersonasInput = z.infer<typeof SuggestAIPersonasInputSchema>;

const SuggestAIPersonasOutputSchema = z.object({
  personas: z.array(z.string()).describe('An array of suggested AI personas.'),
});
export type SuggestAIPersonasOutput = z.infer<typeof SuggestAIPersonasOutputSchema>;

export async function suggestAIPersonas(input: SuggestAIPersonasInput): Promise<SuggestAIPersonasOutput> {
  return suggestAIPersonasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAIPersonasPrompt',
  input: {schema: SuggestAIPersonasInputSchema},
  output: {schema: SuggestAIPersonasOutputSchema},
  prompt: `You are an AI persona suggestion expert. Given a conversation topic or question, you will suggest relevant AI personas to enhance the quality and relevance of the debate.

Topic: {{{topic}}}

Suggest AI personas:`,
});

const suggestAIPersonasFlow = ai.defineFlow(
  {
    name: 'suggestAIPersonasFlow',
    inputSchema: SuggestAIPersonasInputSchema,
    outputSchema: SuggestAIPersonasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
