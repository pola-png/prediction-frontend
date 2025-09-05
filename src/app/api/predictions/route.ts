
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
      .limit(limit)
      .populate({
        path: 'matchId',
        populate: [
          { path: 'homeTeam' },
          { path: 'awayTeam' }
        ]
      });
      
    const matches = predictions.map(p => {
        if (p.matchId) {
            const match = (p.matchId as any).toObject();
            match.prediction = p.toObject();
            delete match.prediction.matchId;
            return match;
        }
        return null;
    }).filter(Boolean);


    return NextResponse.json(matches);
  } catch (error) {
    console.error(`Failed to fetch predictions for bucket ${request.url}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
