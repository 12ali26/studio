// src/ai/flows/debate-visualizer-flow.ts
'use server';

/**
 * @fileOverview Generates a visualization of a multi-AI debate, showing different perspectives and conversation flow.
 *
 * - visualizeDebate - A function that generates the debate visualization.
 * - VisualizeDebateInput - The input type for the visualizeDebate function.
 * - VisualizeDebateOutput - The return type for the visualizeDebate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VisualizeDebateInputSchema = z.object({
  debateTranscript: z
    .string()
    .describe('The transcript of the debate between multiple AI agents.'),
});
export type VisualizeDebateInput = z.infer<typeof VisualizeDebateInputSchema>;

const VisualizeDebateOutputSchema = z.object({
  visualization: z
    .string()
    .describe(
      'A textual representation of the debate visualization, showing different perspectives and conversation flow.'
    ),
});
export type VisualizeDebateOutput = z.infer<typeof VisualizeDebateOutputSchema>;

export async function visualizeDebate(input: VisualizeDebateInput): Promise<VisualizeDebateOutput> {
  return visualizeDebateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'visualizeDebatePrompt',
  input: {schema: VisualizeDebateInputSchema},
  output: {schema: VisualizeDebateOutputSchema},
  prompt: `You are an expert in visualizing debates.  Given the following debate transcript, create a visualization that shows the different perspectives and conversation flow. Highlight how each AI persona influences the conversation and provides a clear overview of the different arguments presented. Use colors and symbols to differentiate between the AI agents and their arguments.  Focus on clarity and ease of understanding for the user.

Debate Transcript:
{{{debateTranscript}}}`,
});

const visualizeDebateFlow = ai.defineFlow(
  {
    name: 'visualizeDebateFlow',
    inputSchema: VisualizeDebateInputSchema,
    outputSchema: VisualizeDebateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
