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

    const predictions = await Prediction.find({ bucket })
      .sort({ createdAt: -1 })
      .limit(limit);
      
    const matchIds = predictions.map(p => p.matchId);

    const matches = await Match.find({ _id: { $in: matchIds } })
      .populate('homeTeam')
      .populate('awayTeam')
      .populate('prediction');

    const matchesById = new Map(matches.map(m => [m._id.toString(), m]));
    const sortedMatches = predictions.map(p => matchesById.get(p.matchId.toString())).filter(Boolean);


    return NextResponse.json(sortedMatches);
  } catch (error) {
    console.error(`Failed to fetch predictions for bucket ${request.url}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
