
'use server';

/**
 * @fileOverview An AI agent for calculating match statistics from historical data.
 *
 * - calculateMatchStats - A function that takes historical match data and returns key statistics.
 */

import {ai} from '@/ai/genkit';
import { CalculateMatchStatsInputSchema, CalculateMatchStatsOutputSchema, type CalculateMatchStatsInput, type CalculateMatchStatsOutput } from '@/lib/types';


export async function calculateMatchStats(input: CalculateMatchStatsInput): Promise<CalculateMatchStatsOutput> {
  return calculateMatchStatsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'calculateMatchStatsPrompt',
  model: 'gemini-1.5-flash-preview',
  input: {schema: CalculateMatchStatsInputSchema},
  output: {schema: CalculateMatchStatsOutputSchema},
  prompt: `You are a sports data analyst. Your task is to calculate key statistics for an upcoming match between {{teamAName}} and {{teamBName}} based on a list of their recent historical matches.

Analyze the provided match data to determine the following:
1.  **Team Form**: For both {{teamAName}} and {{teamBName}}, determine their form from their last 5 matches. Represent form as a sequence of W (win), D (draw), and L (loss), starting from the most recent match. For example, WWLDW.
2.  **Head-to-Head (H2H)**: Analyze all matches where {{teamAName}} and {{teamBName}} played against each other. Summarize the results (e.g., "3 wins for {{teamAName}}, 1 draw, 2 wins for {{teamBName}}").
3.  **Average Goals**: Calculate the average goals scored by {{teamAName}} and {{teamBName}} in their respective recent matches from the provided list.

Here is the historical match data:
{{#each matches}}
- Date: {{this.date}}, {{this.homeTeam}} {{this.homeGoals}} - {{this.awayGoals}} {{this.awayTeam}}
{{/each}}
`,
});

const calculateMatchStatsFlow = ai.defineFlow(
  {
    name: 'calculateMatchStatsFlow',
    inputSchema: CalculateMatchStatsInputSchema,
    outputSchema: CalculateMatchStatsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate match stats. The prompt returned null.');
    }
    return output!;
  }
);
