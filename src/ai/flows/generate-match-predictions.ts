
'use server';

/**
 * @fileOverview An AI agent for generating match predictions.
 *
 * - generateMatchPredictions - A function that generates match predictions.
 */

import {ai} from '@/ai/genkit';
import { GenerateMatchPredictionsInputSchema, GenerateMatchPredictionsOutputSchema, type GenerateMatchPredictionsInput, type GenerateMatchPredictionsOutput } from '@/lib/types';


export async function generateMatchPredictions(input: GenerateMatchPredictionsInput): Promise<GenerateMatchPredictionsOutput> {
  return generateMatchPredictionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMatchPredictionsPrompt',
  model: 'gemini-1.5-flash-preview',
  input: {schema: GenerateMatchPredictionsInputSchema},
  output: {schema: GenerateMatchPredictionsOutputSchema},
  prompt: `You are an expert sports analyst specializing in football (soccer) match predictions. Based on the provided information, generate the most likely outcomes for the match.

Match Details: {{{matchDetails}}}

Team A Form: {{{teamAForm}}}
Team B Form: {{{teamBForm}}}
Head-to-Head Stats: {{{headToHeadStats}}}
Team A Goals: {{{teamAGoals}}}
Team B Goals: {{{teamBGoals}}}

{{#if teamAInjuries}}Team A Injuries: {{{teamAInjuries}}}{{/if}}
{{#if teamBInjuries}}Team B Injuries: {{{teamBInjuries}}}{{/if}}

Consider the following weights when making your predictions:
Team Form Weight: {{{teamFormWeight}}}
Head-to-Head Weight: {{{h2hWeight}}}
Home Advantage Weight: {{{homeAdvWeight}}}
Goals Weight: {{{goalsWeight}}}
{{#if injuriesWeight}}Injuries Weight: {{{injuriesWeight}}}{{/if}}

Provide the following outcomes with probabilities as values between 0 and 1:
- 1X2: home win, draw, away win.
- Double Chance: home/draw, home/away, draw/away.
- Over/Under Goals: over 0.5, over 1.5, over 2.5.
- Both Teams To Score: BTTS Yes, BTTS No.
- Half-Time Result: probability of a draw at half-time.
- Correct Score Range: the most likely range of correct scores (e.g., 1-0/2-1).
- Confidence: your confidence level in the primary prediction (50-100).
- Bucket: categorize the prediction into one of 'vip', '2odds', '5odds', 'big10' based on risk and confidence.`,
});

const generateMatchPredictionsFlow = ai.defineFlow(
  {
    name: 'generateMatchPredictionsFlow',
    inputSchema: GenerateMatchPredictionsInputSchema,
    outputSchema: GenerateMatchPredictionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate match predictions. The prompt returned null.');
    }
    return output!;
  }
);
