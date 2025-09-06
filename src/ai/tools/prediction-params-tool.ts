
'use server';

/**
 * @fileOverview A Genkit tool for providing structured prediction parameters.
 */

import { ai } from '@/ai/genkit';
import { PredictionParametersSchema } from '@/lib/types';


export const predictionParametersTool = ai.defineTool(
  {
    name: 'predictionParametersTool',
    description: 'Provides the weights for a football prediction model.',
    inputSchema: PredictionParametersSchema,
    outputSchema: PredictionParametersSchema,
  },
  async (input) => input
);
