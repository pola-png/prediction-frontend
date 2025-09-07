
'use server';

// This file is now largely obsolete as the primary logic has moved to Lambda functions.
// The getMatchSummary function might be re-purposed later to call a Lambda
// or an AppSync resolver that invokes the AI summarization flow.

// For now, we return a static message.

interface SummarizeMatchInsightsInput {
    matchId: string;
    // other fields...
}

export async function getMatchSummary(input: SummarizeMatchInsightsInput) {
  try {
    return { summary: "AI summary is currently handled by a backend Lambda function and is not available via this endpoint." };
  } catch (error) {
    console.error("Failed to fetch match summary", error);
    return { error: "Could not load AI summary for this match." };
  }
}
