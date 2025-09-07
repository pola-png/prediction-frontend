
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Team from '@/models/Team';
import Prediction from '@/models/Prediction';
import type { Match as MatchType } from '@/lib/types';
import { getAndGeneratePredictions } from '@/services/sports-data-service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_TOKEN}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    await dbConnect();
    // Ensure models are registered
    Team;
    Prediction;

    const upcomingMatches: MatchType[] = await Match.find({
        status: 'scheduled',
        matchDateUtc: { $gte: new Date() },
        prediction: { $exists: false }
    })
    .populate('homeTeam')
    .populate('awayTeam')
    .sort({ matchDateUtc: 1 })
    .lean();

    if (upcomingMatches.length === 0) {
        return NextResponse.json({ success: true, message: 'No matches need predictions.' });
    }
    
    console.log(`Found ${upcomingMatches.length} matches to predict.`);
    await getAndGeneratePredictions(upcomingMatches);

    return NextResponse.json({ success: true, processed: upcomingMatches.length });
  } catch (error) {
    console.error('Failed to generate predictions:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
