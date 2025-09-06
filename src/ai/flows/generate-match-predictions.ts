
'use server';

/**
 * @fileOverview An AI agent for generating match predictions.
 *
 * - generateMatchPredictions - A function that generates match predictions.
 * - GenerateMatchPredictionsInput - The input type for the generateMatchPredictions function.
 * - GenerateMatchPredictionsOutput - The return type for the generateMatchPredictions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMatchPredictionsInputSchema = z.object({
  teamFormWeight: z.number().describe('Weight for team form in prediction.'),
  h2hWeight: z.number().describe('Weight for head-to-head stats in prediction.'),
  homeAdvWeight: z.number().describe('Weight for home advantage in prediction.'),
  goalsWeight: z.number().describe('Weight for goals scored in prediction.'),
  matchDetails: z.string().describe('Details about the match, including teams, date, and league.'),
  teamAForm: z.string().describe('Recent form of team A (last 5-10 matches).'),
  teamBForm: z.string().describe('Recent form of team B (last 5-10 matches).'),
  headToHeadStats: z.string().describe('Head-to-head statistics between the two teams.'),
  teamAGoals: z.string().describe('Average goals scored by team A.'),
  teamBGoals: z.string().describe('Average goals scored by team B.'),
  injuriesWeight: z.number().optional().describe('Weight for injuries in prediction.'),
  teamAInjuries: z.string().optional().describe('Injury information for team A.'),
  teamBInjuries: z.string().optional().describe('Injury information for team B.'),
});
export type GenerateMatchPredictionsInput = z.infer<typeof GenerateMatchPredictionsInputSchema>;

const GenerateMatchPredictionsOutputSchema = z.object({
  oneXTwo: z.object({
    home: z.number().describe('Probability of home team winning (0-1).'),
    draw: z.number().describe('Probability of a draw (0-1).'),
    away: z.number().describe('Probability of away team winning (0-1).'),
  }),
  doubleChance: z.object({
    homeOrDraw: z.number().describe('Probability of home team winning or a draw (0-1).'),
    homeOrAway: z.number().describe('Probability of home or away team winning (0-1).'),
    drawOrAway: z.number().describe('Probability of a draw or away team winning (0-1).'),
  }),
  over05: z.number().describe('Probability of over 0.5 goals (0-1).'),
  over15: z.number().describe('Probability of over 1.5 goals (0-1).'),
  over25: z.number().describe('Probability of over 2.5 goals (0-1).'),
  bttsYes: z.number().describe('Probability of both teams to score (0-1).'),
  bttsNo: z.number().describe('Probability of at least one team not scoring (0-1).'),
  correctScoreRange: z.string().describe('Most likely correct score range.'),
  halfTimeDraw: z.number().describe('Probability of the match being a draw at half-time (0-1).'),
  confidence: z.number().describe('Confidence level of the prediction (50-100).'),
  bucket: z.string().describe('The prediction bucket (vip, 2odds, 5odds, big10).'),
});
export type GenerateMatchPredictionsOutput = z.infer<typeof GenerateMatchPredictionsOutputSchema>;

export async function generateMatchPredictions(input: GenerateMatchPredictionsInput): Promise<GenerateMatchPredictionsOutput> {
  return generateMatchPredictionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMatchPredictionsPrompt',
  model: 'googleai/gemini-1.5-flash-preview',
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
    return output!;
  }
);
