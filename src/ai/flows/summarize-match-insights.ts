
'use server';

/**
 * @fileOverview A GenAI-powered summary of key insights and factors influencing a specific match prediction.
 *
 * - summarizeMatchInsights - A function that handles the match insights summarization process.
 */

import {ai} from '@/ai/genkit';
import { SummarizeMatchInsightsInputSchema, SummarizeMatchInsightsOutputSchema, type SummarizeMatchInsightsInput, type SummarizeMatchInsightsOutput } from '@/lib/types';


export async function summarizeMatchInsights(input: SummarizeMatchInsightsInput): Promise<SummarizeMatchInsightsOutput> {
  return summarizeMatchInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeMatchInsightsPrompt',
  model: 'gemini-1.5-flash-preview',
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
    if (!output) {
      throw new Error('AI failed to generate match insights. The prompt returned null.');
    }
    return output!;
  }
);
