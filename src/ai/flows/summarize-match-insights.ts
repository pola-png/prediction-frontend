'use server';

/**
 * @fileOverview A GenAI-powered summary of key insights and factors influencing a specific match prediction.
 *
 * - summarizeMatchInsights - A function that handles the match insights summarization process.
 * - SummarizeMatchInsightsInput - The input type for the summarizeMatchInsights function.
 * - SummarizeMatchInsightsOutput - The return type for the summarizeMatchInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SummarizeMatchInsightsInputSchema = z.object({
  matchId: z.string().describe('The ID of the match to summarize.'),
  homeTeamName: z.string().describe('The name of the home team.'),
  awayTeamName: z.string().describe('The name of the away team.'),
  prediction: z.object({
    oneXTwo: z.object({
      home: z.number(),
      draw: z.number(),
      away: z.number(),
    }).describe('Probabilities for home win, draw, and away win.'),
    over15: z.number().describe('Probability for over 1.5 goals.'),
    over25: z.number().describe('Probability for over 2.5 goals.'),
    bttsYes: z.number().describe('Probability for both teams to score.'),
    correctScoreRange: z.string().describe('The most likely correct score range.'),
  }).describe('The prediction for the match.'),
  features: z.object({
    teamFormWeight: z.number(),
    h2hWeight: z.number(),
    homeAdvWeight: z.number(),
    goalsWeight: z.number(),
    injuriesWeight: z.number().optional(),
  }).describe('Weights of the features used in the prediction.'),
});
export type SummarizeMatchInsightsInput = z.infer<typeof SummarizeMatchInsightsInputSchema>;

const SummarizeMatchInsightsOutputSchema = z.object({
  summary: z.string().describe('A summary of the key insights and factors influencing the match prediction.'),
});
export type SummarizeMatchInsightsOutput = z.infer<typeof SummarizeMatchInsightsOutputSchema>;

export async function summarizeMatchInsights(input: SummarizeMatchInsightsInput): Promise<SummarizeMatchInsightsOutput> {
  return summarizeMatchInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeMatchInsightsPrompt',
  model: 'googleai/gemini-1.5-flash-preview',
  input: {
    schema: SummarizeMatchInsightsInputSchema,
  },
  output: {
    schema: SummarizeMatchInsightsOutputSchema,
  },
  prompt: `Provide a concise summary of the key insights and factors influencing the prediction for the match between {{homeTeamName}} and {{awayTeamName}} (Match ID: {{matchId}}).

  Prediction:
  - Home Win: {{prediction.oneXTwo.home}}
  - Draw: {{prediction.oneXTwo.draw}}
  - Away Win: {{prediction.oneXTwo.away}}
  - Over 1.5 Goals: {{prediction.over15}}
  - Over 2.5 Goals: {{prediction.over25}}
  - Both Teams to Score: {{prediction.bttsYes}}
  - Most Likely Correct Score Range: {{prediction.correctScoreRange}}

  Feature Weights:
  - Team Form Weight: {{features.teamFormWeight}}
  - Head-to-Head Weight: {{features.h2hWeight}}
  - Home Advantage Weight: {{features.homeAdvWeight}}
  - Goals Weight: {{features.goalsWeight}}
  {{#if features.injuriesWeight}}
  - Injuries Weight: {{features.injuriesWeight}}
  {{/if}}

  Focus on the most significant factors that contribute to the predicted outcomes, such as team form, head-to-head statistics, home advantage, and goal-scoring trends. Explain the rationale behind the prediction in a way that is easy to understand.
  `,
});

const summarizeMatchInsightsFlow = ai.defineFlow(
  {
    name: 'summarizeMatchInsightsFlow',
    inputSchema: SummarizeMatchInsightsInputSchema,
    outputSchema: SummarizeMatchInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
