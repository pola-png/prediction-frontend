import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import History from '@/models/History';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';
import Team from '@/models/Team';

export async function GET(request: Request) {
  try {
    await dbConnect();
    // Ensure models are registered
    const HistoryModel = History;
    const MatchModel = Match;
    const PredictionModel = Prediction;
    const TeamModel = Team;


    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const recentResults = await HistoryModel.find()
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
