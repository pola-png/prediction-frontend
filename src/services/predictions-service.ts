
'use server';

import dbConnect from "@/lib/mongodb";
import MatchModel from "@/models/Match";
import PredictionModel from "@/models/Prediction";
import TeamModel from "@/models/Team";
import type { IPrediction } from '@/models/Prediction';
import type { Match } from "@/lib/types";

export async function getMatchesForBucket(bucket: string, limit = 10) {
    await dbConnect();

    // Ensure models are registered
    const Match = MatchModel;
    const Prediction = PredictionModel;
    const Team = TeamModel;

    // 1. Find predictions that match the bucket
    const predictions = await Prediction.find({ bucket: bucket }).select('_id matchId').lean();
    const matchIds = predictions.map(p => p.matchId);

    // 2. Find upcoming matches that correspond to those predictions
    const matches = await Match.find({
      _id: { $in: matchIds },
      status: 'scheduled',
      matchDateUtc: { $gte: new Date() }
    })
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('prediction')
    .sort({ matchDateUtc: 1 })
    .limit(limit)
    .lean();

    return matches as Match[];
}


function getOutcomeOdds(prediction: IPrediction): number {
    if (!prediction) return 1;

    const { home, away, draw } = prediction.outcomes.oneXTwo;
    const maxProb = Math.max(home, away, draw);

    if (maxProb === 0) return 1;
    // Basic conversion from probability to odds.
    // Real-world odds would include a bookmaker's margin.
    return 1 / maxProb;
}


export async function calculateAccumulatorOdds(matchIds: string[]): Promise<string | null> {
    try {
        await dbConnect();
        
        if (!matchIds || matchIds.length === 0) {
            return '1.00';
        }

        const matches = await MatchModel.find({
            _id: { $in: matchIds },
        }).populate('prediction').lean();

        if (matches.length !== matchIds.length) {
            console.error('One or more matches not found for odds calculation.');
            return null;
        }

        let totalOdds = 1;
        for (const match of matches) {
            if (!match.prediction) {
                console.error(`Match ${match._id} is missing a prediction for odds calculation.`);
                return null;
            }
            totalOdds *= getOutcomeOdds(match.prediction as IPrediction);
        }
        
        return totalOdds.toFixed(2);

    } catch (error) {
        console.error('Failed to calculate odds:', error);
        return null;
    }
}
