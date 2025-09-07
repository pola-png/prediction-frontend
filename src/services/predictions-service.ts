
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';
import Team from '@/models/Team';
import { sanitizeObject } from '@/lib/utils';
import type { Match as MatchType } from '@/lib/types';

export async function getMatchesForBucket(bucket: string, limit: number = 20): Promise<MatchType[]> {
    await dbConnect();
    // Ensure models are registered
    Team;
    Prediction;
    
    const matches = await Match.find({
        'prediction.bucket': bucket,
        status: 'scheduled',
        matchDateUtc: { $gte: new Date() }
    })
    .sort({ 'prediction.confidence': -1, matchDateUtc: 1 })
    .limit(limit)
    .populate('homeTeam')
    .populate('awayTeam')
    .populate({
        path: 'prediction',
        match: { bucket: bucket }
    })
    .lean();

    // Second filter in code because lean doesn't apply the populate match filter
    const filteredMatches = matches.filter(m => m.prediction);

    return sanitizeObject(filteredMatches);
}
