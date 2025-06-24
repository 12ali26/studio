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
  personas: z.array(z.string()).describe('An array of suggested AI persona names (e.g., "Alex (CEO)", "Sam (CTO)") from the available list.'),
});
export type SuggestAIPersonasOutput = z.infer<typeof SuggestAIPersonasOutputSchema>;

export async function suggestAIPersonas(input: SuggestAIPersonasInput): Promise<SuggestAIPersonasOutput> {
  return suggestAIPersonasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAIPersonasPrompt',
  input: {schema: SuggestAIPersonasInputSchema},
  output: {schema: SuggestAIPersonasOutputSchema},
  prompt: `You are an expert at assembling a boardroom of AI experts for a debate.
Given a conversation topic, you must select the three most relevant AI personas from the provided list to ensure a high-quality, multi-faceted discussion.

Available Personas:
- Alex (CEO): Strategic Visionary. Focuses on growth, market positioning, stakeholder value.
- Sam (CTO): Technical Leader. Focuses on architecture, scalability, implementation feasibility.
- Jordan (CMO): Creative Marketer. Focuses on brand positioning, customer experience, innovation.
- Taylor (CFO): Financial Analyst. Focuses on ROI analysis, risk assessment, budget optimization.
- Casey (Advisor): Wise Moderator. Focuses on synthesis, ethics, long-term thinking.

Topic: {{{topic}}}

Return the names of the three most relevant personas.`,
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
