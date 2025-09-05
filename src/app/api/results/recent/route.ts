import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import History from '@/models/History';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const recentResults = await History.find()
      .sort({ resolvedAt: -1 })
      .limit(limit)
      .populate({
        path: 'matchId',
        populate: [
          { path: 'homeTeam' },
          { path: 'awayTeam' }
        ]
      })
      .populate('predictionId');

    return NextResponse.json(recentResults);
  } catch (error) {
    console.error('Failed to fetch recent results:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
