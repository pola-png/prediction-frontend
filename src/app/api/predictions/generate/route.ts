
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import { getAndGeneratePredictions } from '@/services/sports-data-service';

export async function GET(request: Request) {
  try {
    await dbConnect();

    // 1. Find all upcoming matches that DO NOT have a prediction.
    const matchesWithoutPrediction = await Match.find({
        status: 'scheduled',
        matchDateUtc: { $gte: new Date() },
        prediction: { $exists: false }
    })
    .populate('homeTeam')
    .populate('awayTeam')
    .lean();

    if (matchesWithoutPrediction.length === 0) {
      return NextResponse.json({ message: 'No upcoming matches are missing predictions.' });
    }

    // 2. Generate predictions for them.
    await getAndGeneratePredictions(matchesWithoutPrediction);

    return NextResponse.json({ 
        message: `Successfully generated predictions for ${matchesWithoutPrediction.length} matches.`
    });

  } catch (error: any) {
    console.error('Failed to generate predictions via API:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

