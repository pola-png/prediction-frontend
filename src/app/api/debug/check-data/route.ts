
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';
import Team from '@/models/Team';

export async function GET(request: Request) {
  try {
    await dbConnect();

    // To ensure models are registered
    const TeamModel = Team;
    const MatchModel = Match;
    const PredictionModel = Prediction;

    const matches = await MatchModel.find()
      .populate('homeTeam')
      .populate('awayTeam')
      .populate('prediction');

    const predictions = await PredictionModel.find().populate('matchId');

    return NextResponse.json({ 
        message: "Data check complete. See the data below.",
        matchesCount: matches.length,
        predictionsCount: predictions.length,
        matches,
        predictions,
    });
  } catch (error: any) {
    console.error('Failed to fetch debug data:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
