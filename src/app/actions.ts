
'use server';

import type { SummarizeMatchInsightsInput } from "@/ai/flows/summarize-match-insights";

// This function needs to be updated to work with the new AI flow structure
// and data fetching from DynamoDB via an API Gateway.
export async function getMatchSummary(input: SummarizeMatchInsightsInput) {
  try {
    // const result = await summarizeMatchInsights(input);
    // return { summary: result.summary };
    return { summary: "AI summary is currently disabled pending backend migration." };
  } catch (error) {
    console.error("Failed to fetch match summary", error);
    return { error: "Could not load AI summary for this match." };
  }
}
