
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';
import Team from '@/models/Team';
import type { IPrediction } from '@/models/Prediction';

function getOutcomeOdds(prediction: IPrediction): number {
    if (!prediction) return 1;

    const { home, away, draw } = prediction.outcomes.oneXTwo;
    const maxProb = Math.max(home, away, draw);

    if (maxProb === 0) return 1;
    // Basic conversion from probability to odds.
    // Real-world odds would include a bookmaker's margin.
    return 1 / maxProb;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    // Ensure models are registered
    const MatchModel = Match;
    const PredictionModel = Prediction;
    const TeamModel = Team;

    const { matchIds } = await request.json();

    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json({ message: 'Match IDs are required' }, { status: 400 });
    }

    const matches = await MatchModel.find({
      _id: { $in: matchIds },
    }).populate('prediction').lean();

    if (matches.length !== matchIds.length) {
        return NextResponse.json({ message: 'One or more matches not found or missing a prediction.' }, { status: 404 });
    }

    let totalOdds = 1;
    for (const match of matches) {
        if (!match.prediction) {
            // This case should ideally not be hit if we design the page logic correctly
             return NextResponse.json({ message: `Match ${match._id} is missing a prediction.` }, { status: 500 });
        }
        totalOdds *= getOutcomeOdds(match.prediction as IPrediction);
    }
    
    return NextResponse.json({ totalOdds: totalOdds.toFixed(2) });

  } catch (error) {
    console.error('Failed to calculate odds:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
