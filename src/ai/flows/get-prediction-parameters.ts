
'use server';

/**
 * @fileOverview An AI agent for determining the optimal parameters for a match prediction model.
 *
 * - getPredictionParameters - A function that returns the weights for various factors in a match prediction.
 */

import { ai } from '@/ai/genkit';
import {
  predictionParametersTool,
} from '@/ai/tools/prediction-params-tool';
import { GetPredictionParametersInputSchema, PredictionParametersSchema, type GetPredictionParametersInput, type PredictionParameters } from '@/lib/types';


export async function getPredictionParameters(input: GetPredictionParametersInput): Promise<PredictionParameters> {
  const getPredictionParametersFlow = ai.defineFlow(
    {
      name: 'getPredictionParametersFlow',
      inputSchema: GetPredictionParametersInputSchema,
      outputSchema: PredictionParametersSchema,
    },
    async (input) => {
      const prompt = `You are a sports data scientist. Your task is to determine the best weights for a football prediction model based on the context of a match.

Analyze the match details provided and decide the importance of each factor.

For example:
- In a derby or rivalry match, Head-to-Head (H2H) stats might be more important, so h2hWeight should be higher.
- In a cup final or a match between two very defensive teams, team form might be less relevant than big-match experience or defensive solidity, so teamFormWeight might be lower.
- If one team is on a hot streak of scoring, their recent goal-scoring form is highly significant, so goalsWeight should be higher.

The weights (teamFormWeight, h2hWeight, homeAdvWeight, goalsWeight) MUST sum to 1.0.

Match Details: ${input.matchDetails}

Now, call the predictionParametersTool with the calculated weights. Your response MUST be a valid call to this tool.
`;

      const llmResponse = await ai.generate({
        model: 'gemini-1.5-flash-preview',
        prompt: prompt,
        tools: [predictionParametersTool],
        toolConfig: {
          choice: 'required'
        }
      });

      const toolRequest = llmResponse.toolRequest();

      if (!toolRequest) {
        throw new Error('AI failed to call the prediction parameters tool.');
      }
      
      const validatedParams = PredictionParametersSchema.parse(toolRequest.input);

      const sum = validatedParams.teamFormWeight + validatedParams.h2hWeight + validatedParams.homeAdvWeight + validatedParams.goalsWeight;
      if (Math.abs(sum - 1.0) > 0.01) {
          throw new Error(`AI returned weights that do not sum to 1.0. Sum was: ${sum}. Weights: ${JSON.stringify(validatedParams)}`);
      }

      return validatedParams;
    }
  );
  return getPredictionParametersFlow(input);
}
