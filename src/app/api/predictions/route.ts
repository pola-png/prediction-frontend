
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!bucket) {
      return NextResponse.json({ message: 'Bucket parameter is required' }, { status: 400 });
    }
    
    const matchesWithPredictions = await Match.find({
        'prediction': { $exists: true },
        'status': 'scheduled',
        'matchDateUtc': { $gte: new Date() }
    })
    .populate({
        path: 'prediction',
        match: { bucket: bucket }
    })
    .populate('homeTeam')
    .populate('awayTeam')
    .sort({ matchDateUtc: 1 })
    .limit(limit);

    const filteredMatches = matchesWithPredictions.filter(m => m.prediction);

    return NextResponse.json(filteredMatches);
  } catch (error) {
    console.error(`Failed to fetch predictions for bucket ${request.url}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
