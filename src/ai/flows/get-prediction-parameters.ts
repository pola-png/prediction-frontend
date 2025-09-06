
'use server';

/**
 * @fileOverview An AI agent for determining the optimal parameters for a match prediction model.
 *
 * - getPredictionParameters - A function that returns the weights for various factors in a match prediction.
 * - GetPredictionParametersInput - The input type for the getPredictionParameters function.
 * - PredictionParameters - The return type for the getPredictionParameters function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  predictionParametersTool,
  PredictionParametersSchema,
  type PredictionParameters,
} from '@/ai/tools/prediction-params-tool';


const GetPredictionParametersInputSchema = z.object({
  matchDetails: z.string().describe('Details about the match, including teams, date, and league.'),
});
export type GetPredictionParametersInput = z.infer<typeof GetPredictionParametersInputSchema>;


export { type PredictionParameters };

export async function getPredictionParameters(input: GetPredictionParametersInput): Promise<PredictionParameters> {
  return getPredictionParametersFlow(input);
}


const getPredictionParametersFlow = ai.defineFlow(
  {
    name: 'getPredictionParametersFlow',
    inputSchema: GetPredictionParametersInputSchema,
    outputSchema: PredictionParametersSchema,
  },
  async (input) => {
    const prompt = `You are a sports data scientist. Your task is to determine the best weights for a football prediction model based on the context of a match.

Analyze the match details provided and decide the importance of each factor. For example:
- In a derby or rivalry, Head-to-Head (H2H) stats might be more important.
- In a cup final, team form might be less relevant than big-match experience.
- If one team is much stronger, their recent goal-scoring form is highly significant.

The weights must sum to 1.0.

Match Details: ${input.matchDetails}

Now, call the predictionParametersTool with the calculated weights.
`;

    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash-preview',
      prompt: prompt,
      tools: [predictionParametersTool],
    });

    const toolRequest = llmResponse.toolRequest();

    if (!toolRequest) {
      throw new Error('AI failed to call the prediction parameters tool.');
    }
    
    const validatedParams = PredictionParametersSchema.parse(toolRequest.input);

    const sum = validatedParams.teamFormWeight + validatedParams.h2hWeight + validatedParams.homeAdvWeight + validatedParams.goalsWeight;
    if (Math.abs(sum - 1.0) > 0.01) {
        throw new Error(`AI returned weights that do not sum to 1.0. Sum was: ${sum}`);
    }

    return validatedParams;
  }
);
