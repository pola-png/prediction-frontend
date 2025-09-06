
'use server';

/**
 * @fileOverview An AI agent for calculating match statistics from historical data.
 *
 * - calculateMatchStats - A function that takes historical match data and returns key statistics.
 */

import {ai} from '@/ai/genkit';
import { CalculateMatchStatsInputSchema, CalculateMatchStatsOutputSchema, type CalculateMatchStatsInput, type CalculateMatchStatsOutput } from '@/lib/types';


export async function calculateMatchStats(input: CalculateMatchStatsInput): Promise<CalculateMatchStatsOutput> {
  const calculateMatchStatsFlow = ai.defineFlow(
    {
      name: 'calculateMatchStatsFlow',
      inputSchema: CalculateMatchStatsInputSchema,
      outputSchema: CalculateMatchStatsOutputSchema,
    },
    async (input) => {
      const prompt = `
You are a sports data analyst. Your task is to calculate key statistics for an upcoming match between ${input.teamAName} and ${input.teamBName} based on a list of their recent historical matches.

Analyze the provided match data to determine the following. Your response MUST be a valid JSON object that conforms to the specified schema.

1.  **Team Form**: For both ${input.teamAName} and ${input.teamBName}, determine their form from their last 5 matches. Represent form as a sequence of W (win), D (draw), and L (loss), starting from the most recent match. For example, WWLDW. If a team has fewer than 5 matches, provide the form for the matches available. A team's match is one where they are either the home or away team.

2.  **Head-to-Head (H2H)**: Analyze all matches where ${input.teamAName} and ${input.teamBName} played against each other. Summarize the results (e.g., "3 wins for ${input.teamAName}, 1 draw, 2 wins for ${input.teamBName}}").

3.  **Average Goals**: Calculate the average goals scored by ${input.teamAName} and ${input.teamBName} in their respective recent matches from the provided list. Provide the result as a string rounded to two decimal places (e.g., "1.50").

Here is the historical match data:
${input.matches.map(m => `- Date: ${m.date}, ${m.homeTeam} ${m.homeGoals} - ${m.awayGoals} ${m.awayTeam}`).join('\n')}

Example of a valid JSON output:
{
  "teamAForm": "WWLWD",
  "teamBForm": "DLWLD",
  "headToHeadStats": "1 win for ${input.teamAName}, 2 draws, 0 wins for ${input.teamBName}",
  "teamAGoals": "2.40",
  "teamBGoals": "1.20"
}
`;

      const llmResponse = await ai.generate({
        model: 'gemini-1.5-flash-preview',
        prompt: prompt,
        output: {
          schema: CalculateMatchStatsOutputSchema,
        }
      });
      
      const output = llmResponse.output();
      if (!output) {
        throw new Error('AI failed to generate match stats. The prompt returned null.');
      }
      return output;
    }
  );
  return calculateMatchStatsFlow(input);
}

