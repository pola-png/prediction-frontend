
'use server';

/**
 * @fileOverview A Genkit tool for providing structured prediction parameters.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const PredictionParametersSchema = z.object({
  teamFormWeight: z.number().describe('Weight for team form in prediction (0-1).'),
  h2hWeight: z.number().describe('Weight for head-to-head stats in prediction (0-1).'),
  homeAdvWeight: z.number().describe('Weight for home advantage in prediction (0-1).'),
  goalsWeight: z.number().describe('Weight for goals scored in prediction (0-1).'),
});
export type PredictionParameters = z.infer<typeof PredictionParametersSchema>;

export const predictionParametersTool = ai.defineTool(
  {
    name: 'predictionParametersTool',
    description: 'Provides the weights for a football prediction model.',
    inputSchema: PredictionParametersSchema,
    outputSchema: PredictionParametersSchema,
  },
  async (input) => input
);
