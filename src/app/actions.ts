'use server';

import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';
import Team from '@/models/Team';
import { summarizeMatchInsights } from '@/ai/flows/summarize-match-insights';
import { sanitizeObject } from '@/lib/utils';
import type { SummarizeMatchInsightsInput, Match as MatchType } from '@/lib/types';


export async function getMatchSummary(input: { matchId: string }) {
  try {
    await dbConnect();
    // Ensure models are registered
    Team;
    Prediction;
    
    const match = await Match.findById(input.matchId)
        .populate('prediction')
        .populate('homeTeam')
        .populate('awayTeam')
        .lean() as MatchType | null;

    if (!match || !match.prediction) {
      return { error: "Prediction not found for this match." };
    }

    // This check is important because the lean object might not have the nested populated documents
     if (!match.homeTeam || !match.awayTeam) {
      return { error: 'Could not load team details for summary.' };
    }

    const summaryInput: SummarizeMatchInsightsInput = {
      matchId: match._id.toString(),
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      prediction: sanitizeObject(match.prediction),
      features: match.prediction.features!,
    };

    const summary = await summarizeMatchInsights(summaryInput);

    return { summary: summary.summary };
  } catch (error) {
    console.error("Failed to fetch match summary", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: `Could not load AI summary for this match. ${errorMessage}` };
  }
}
