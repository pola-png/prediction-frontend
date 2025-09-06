
'use server';

/**
 * @fileOverview An AI agent for determining the optimal parameters for a match prediction model.
 *
 * - getPredictionParameters - A function that returns the weights for various factors in a match prediction.
 * - GetPredictionParametersInput - The input type for the getPredictionParameters function.
 * - PredictionParameters - The return type for the getPredictionParameters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetPredictionParametersInputSchema = z.object({
  matchDetails: z.string().describe('Details about the match, including teams, date, and league.'),
});
export type GetPredictionParametersInput = z.infer<typeof GetPredictionParametersInputSchema>;

const PredictionParametersSchema = z.object({
  teamFormWeight: z.number().describe('Weight for team form in prediction.'),
  h2hWeight: z.number().describe('Weight for head-to-head stats in prediction.'),
  homeAdvWeight: z.number().describe('Weight for home advantage in prediction.'),
  goalsWeight: z.number().describe('Weight for goals scored in prediction.'),
});
export type PredictionParameters = z.infer<typeof PredictionParametersSchema>;

export async function getPredictionParameters(input: GetPredictionParametersInput): Promise<PredictionParameters> {
  return getPredictionParametersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getPredictionParametersPrompt',
  model: 'gemini-1.5-flash-preview',
  input: {schema: GetPredictionParametersInputSchema},
  output: {schema: z.string().describe('A JSON string representing the prediction parameters.')},
  prompt: `You are a sports data scientist. Your task is to determine the best weights for a football prediction model based on the context of a match.

Analyze the match details provided and decide the importance of each factor. For example:
- In a derby or rivalry, Head-to-Head (H2H) stats might be more important.
- In a cup final, team form might be less relevant than big-match experience (which we'll approximate with form and H2H).
- If one team is much stronger, their recent goal-scoring form is highly significant.
- For a friendly match, all weights might be lower and more evenly distributed.

The weights must sum to 1.0.

Match Details: {{{matchDetails}}}

Provide your response as a valid JSON string with the keys: "teamFormWeight", "h2hWeight", "homeAdvWeight", "goalsWeight".
`,
});

const getPredictionParametersFlow = ai.defineFlow(
  {
    name: 'getPredictionParametersFlow',
    inputSchema: GetPredictionParametersInputSchema,
    outputSchema: PredictionParametersSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate prediction parameters string. The prompt returned null.');
    }
    
    try {
      // Clean the output string to ensure it's valid JSON
      const cleanedOutput = output.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedOutput);
      
      // Validate the parsed object against the Zod schema
      const validatedParams = PredictionParametersSchema.parse(parsed);

      // Optional: Verify the sum of weights
      const sum = validatedParams.teamFormWeight + validatedParams.h2hWeight + validatedParams.homeAdvWeight + validatedParams.goalsWeight;
      if (Math.abs(sum - 1.0) > 0.01) {
          throw new Error(`AI returned weights that do not sum to 1.0. Sum was: ${sum}`);
      }

      return validatedParams;
    } catch (e: any) {
        console.error("Failed to parse or validate AI output for prediction parameters:", output);
        throw new Error(`Failed to process AI response for prediction parameters: ${e.message}`);
    }
  }
);
