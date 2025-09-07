
'use server';

/**
 * @fileOverview An AI agent for generating match predictions.
 *
 * - generateMatchPredictions - A function that generates match predictions.
 */

import {ai} from '@/ai/genkit';
import { GenerateMatchPredictionsInputSchema, GenerateMatchPredictionsOutputSchema, type GenerateMatchPredictionsInput, type GenerateMatchPredictionsOutput } from '@/lib/types';


const generateMatchPredictionsFlow = ai.defineFlow(
  {
    name: 'generateMatchPredictionsFlow',
    inputSchema: GenerateMatchPredictionsInputSchema,
    outputSchema: GenerateMatchPredictionsOutputSchema,
  },
  async (input) => {
    const prompt = `
You are an expert sports analyst specializing in football (soccer) match predictions. Your response MUST be a valid JSON object that conforms to the specified schema.

Your primary focus is to generate predictions for the following markets:
- Double Chance (e.g., Home or Draw, Home or Away, Draw or Away)
- Over/Under Goals (e.g., Over 1.5, Over 2.5)
- Both Teams to Score (BTTS) / GoalGazer (GG)

Analyze the provided data to determine the most likely outcomes for these markets. While you will provide a standard 1X2 prediction, your analysis should favor the more flexible markets listed above. Do not focus on high-risk predictions like exact correct scores.

Match Details: ${input.matchDetails}

Team A Form (${input.teamAForm.length}): ${input.teamAForm}
Team B Form (${input.teamBForm.length}): ${input.teamBForm}
Head-to-Head Stats: ${input.headToHeadStats}
Team A Avg Goals: ${input.teamAGoals}
Team B Avg Goals: ${input.teamBGoals}

${input.teamAInjuries ? `Team A Injuries: ${input.teamAInjuries}` : ''}
${input.teamBInjuries ? `Team B Injuries: ${input.teamBInjuries}` : ''}

Consider the following weights when making your predictions:
Team Form Weight: ${input.teamFormWeight}
Head-to-Head Weight: ${input.h2hWeight}
Home Advantage Weight: ${input.homeAdvWeight}
Goals Weight: ${input.goalsWeight}
${input.injuriesWeight ? `Injuries Weight: ${input.injuriesWeight}` : ''}

Provide the following outcomes with probabilities as values between 0 and 1. The sum of probabilities for 'home', 'draw', and 'away' in the 'oneXTwo' market must equal 1.0.

- 1X2: home win, draw, away win.
- Double Chance: home/draw, home/away, draw/away.
- Over/Under Goals: over 0.5, over 1.5, over 2.5.
- Both Teams To Score: BTTS Yes, BTTS No.
- Confidence: your confidence level in the primary prediction (50-100).
- Bucket: categorize the prediction into one of 'vip', '2odds', '5odds', 'big10' based on risk and confidence.

Example of a valid JSON output:
{
  "oneXTwo": {"home": 0.45, "draw": 0.3, "away": 0.25},
  "doubleChance": {"homeOrDraw": 0.75, "homeOrAway": 0.7, "drawOrAway": 0.55},
  "over05": 0.95,
  "over15": 0.8,
  "over25": 0.55,
  "bttsYes": 0.6,
  "bttsNo": 0.4,
  "confidence": 85,
  "bucket": "vip"
}
`;

    const llmResponse = await ai.generate({
      model: 'gemini-1.5-flash-preview',
      prompt: prompt,
      output: {
        schema: GenerateMatchPredictionsOutputSchema,
      }
    });
    
    const output = llmResponse.output();
    if (!output) {
      throw new Error('AI failed to generate match predictions. The prompt returned null.');
    }
    return output;
  }
);

export async function generateMatchPredictions(input: GenerateMatchPredictionsInput): Promise<GenerateMatchPredictionsOutput> {
  return generateMatchPredictionsFlow(input);
}
