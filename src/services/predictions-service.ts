
'use server';

import dbConnect from "@/lib/mongodb";
import MatchModel from "@/models/Match";
import PredictionModel from "@/models/Prediction";
import TeamModel from "@/models/Team";
import type { IPrediction } from '@/models/Prediction';
import type { Match } from "@/lib/types";
import { sanitizeObject } from "@/lib/utils";

export async function getMatchesForBucket(bucket?: string | string[], limit = 10): Promise<Match[]> {
    await dbConnect();

    // Ensure models are registered
    const Match = MatchModel;
    const Prediction = PredictionModel;
    const Team = TeamModel;
    
    const predictionFilter: { bucket?: any } = {};
    if (bucket) {
        if (Array.isArray(bucket)) {
            predictionFilter.bucket = { $in: bucket };
        } else {
            predictionFilter.bucket = bucket;
        }
    }

    // 1. Find predictions that match the bucket(s)
    const predictions = await Prediction.find(predictionFilter).select('_id matchId').lean();
    const matchIds = predictions.map(p => p.matchId);

    const findQuery: any = {
      _id: { $in: matchIds },
      status: 'scheduled',
      matchDateUtc: { $gte: new Date() },
      prediction: { $exists: true, $ne: null }
    };

    // 2. Find upcoming matches that correspond to those predictions
    const matches = await Match.find(findQuery)
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('prediction')
    .sort({ matchDateUtc: 1 })
    .limit(Array.isArray(bucket) ? 100 : limit) // Increase limit if fetching for all buckets
    .lean();

    return sanitizeObject<Match[]>(matches);
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
