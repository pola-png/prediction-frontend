'use server';

/**
 * @fileOverview An AI agent for calculating match statistics from historical data.
 *
 * - calculateMatchStats - A function that takes historical match data and returns key statistics.
 * - CalculateMatchStatsInput - The input type for the calculateMatchStats function.
 * - CalculateMatchStatsOutput - The return type for the calculateMatchStats function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchRecordSchema = z.object({
    date: z.string().describe("The date of the match."),
    homeTeam: z.string().describe("The name of the home team."),
    awayTeam: z.string().describe("The name of the away team."),
    homeGoals: z.number().describe("Goals scored by the home team."),
    awayGoals: z.number().describe("Goals scored by the away team."),
});


const CalculateMatchStatsInputSchema = z.object({
  teamAName: z.string().describe('The name of the first primary team (Team A).'),
  teamBName: z.string().describe('The name of the second primary team (Team B).'),
  matches: z.array(MatchRecordSchema).describe('A list of recent historical matches involving either team.'),
});
export type CalculateMatchStatsInput = z.infer<typeof CalculateMatchStatsInputSchema>;


const CalculateMatchStatsOutputSchema = z.object({
  teamAForm: z.string().describe("A summary of Team A's recent form (e.g., WWLDW)."),
  teamBForm: z.string().describe("A summary of Team B's recent form (e.g., DLLWW)."),
  headToHeadStats: z.string().describe('A summary of the head-to-head results between the two teams.'),
  teamAGoals: z.string().describe("The average number of goals Team A has scored in their recent matches."),
  teamBGoals: z.string().describe("The average number of goals Team B has scored in their recent matches."),
});
export type CalculateMatchStatsOutput = z.infer<typeof CalculateMatchStatsOutputSchema>;


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
1.  **Team Form**: For both {{teamAName}} and {{teamBName}}, determine their form from their last 5 matches. Represent form as a sequence of W (win), D (draw), and L (loss). For example, WWLDW.
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
    return output;
  }
);
