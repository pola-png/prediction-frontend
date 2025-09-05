import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';

export async function GET(request: Request) {
  try {
    await dbConnect();
    // Ensure models are registered
    const MatchModel = Match;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const upcomingMatches = await MatchModel.find({
      matchDateUtc: { $gte: new Date() },
      status: 'scheduled',
    })
    .sort({ matchDateUtc: 1 })
    .limit(limit)
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('prediction');

    return NextResponse.json(upcomingMatches);
  } catch (error) {
    console.error('Failed to fetch upcoming matches:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
