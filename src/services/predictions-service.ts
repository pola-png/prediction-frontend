
'use server';

import dbConnect from "@/lib/mongodb";
import MatchModel from "@/models/Match";
import PredictionModel from "@/models/Prediction";
import TeamModel from "@/models/Team";

export async function getMatchesForBucket(bucket: string, limit = 10) {
    await dbConnect();
    // Ensure models are registered
    const MatchModel = Match;
    const PredictionModel = Prediction;
    const TeamModel = Team;

    // 1. Find predictions that match the bucket
    const predictions = await PredictionModel.find({ bucket: bucket }).select('_id matchId').lean();
    const matchIds = predictions.map(p => p.matchId);

    // 2. Find upcoming matches that correspond to those predictions
    const matches = await MatchModel.find({
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

    return matches;
}
