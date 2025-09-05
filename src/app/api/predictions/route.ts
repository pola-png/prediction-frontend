
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
    
    // 1. Find predictions that match the bucket
    const predictions = await Prediction.find({ bucket: bucket }).select('matchId');
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
    .limit(limit);

    return NextResponse.json(matches);
  } catch (error) {
    console.error(`Failed to fetch predictions for bucket ${request.url}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
