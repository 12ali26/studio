'use server';

/**
 * @fileOverview Fetches and categorizes available AI models from OpenRouter.
 * 
 * - getOpenRouterModels - A function that fetches and processes models from OpenRouter.
 * - OpenRouterModel - The type definition for a model from OpenRouter.
 * - GetOpenRouterModelsOutput - The return type for the getOpenRouterModels function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const OpenRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pricing: z.object({
    prompt: z.string().nullable(),
    completion: z.string().nullable(),
    request: z.string().nullable(),
    image: z.string().nullable(),
  }),
  context_length: z.number().nullable().optional(),
  architecture: z.object({
    modality: z.string(),
    tokenizer: z.string().optional(),
    instruct_type: z.string().nullable().optional(),
  }),
  top_provider: z.object({
    max_completion_tokens: z.number().nullable().optional(),
    is_moderated: z.boolean().optional(),
  }).nullable().optional(),
  category: z.enum(['Premium', 'Standard', 'Budget']).optional(),
});

export type OpenRouterModel = z.infer<typeof OpenRouterModelSchema>;

const GetOpenRouterModelsOutputSchema = z.object({
  models: z.array(OpenRouterModelSchema),
});

export type GetOpenRouterModelsOutput = z.infer<typeof GetOpenRouterModelsOutputSchema>;

const classifyModel = (model: OpenRouterModel): OpenRouterModel['category'] => {
  const promptPrice = model.pricing.prompt ? parseFloat(model.pricing.prompt) * 1_000_000 : 0;
  if (promptPrice > 5) return 'Premium';
  if (promptPrice > 0.5) return 'Standard';
  return 'Budget';
};

export async function getOpenRouterModels(): Promise<GetOpenRouterModelsOutput> {
  return getOpenRouterModelsFlow();
}

const getOpenRouterModelsFlow = ai.defineFlow(
  {
    name: 'getOpenRouterModelsFlow',
    inputSchema: z.void(),
    outputSchema: GetOpenRouterModelsOutputSchema,
  },
  async () => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (!response.ok) {
        throw new Error(`Failed to fetch models from OpenRouter: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Filter for text models that are not context-only and have pricing
      const models = (data.data as OpenRouterModel[])
        .filter(m => 
          m.id &&
          !m.id.includes("context") && 
          m.pricing?.prompt && 
          parseFloat(m.pricing.prompt) > 0
        )
        .map(model => ({
          ...model,
          category: classifyModel(model),
        }));
        
      return { models };
    } catch (error) {
      console.error("Error fetching OpenRouter models:", error);
      return { models: [] };
    }
  }
);
