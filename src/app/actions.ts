
'use server';

import { summarizeMatchInsights, type SummarizeMatchInsightsInput } from "@/ai/flows/summarize-match-insights";

export async function getMatchSummary(input: SummarizeMatchInsightsInput) {
  try {
    const result = await summarizeMatchInsights(input);
    return { summary: result.summary };
  } catch (error) {
    console.error("Failed to fetch match summary", error);
    return { error: "Could not load AI summary for this match." };
  }
}
