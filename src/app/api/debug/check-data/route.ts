
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';
import Team from '@/models/Team';
import History from '@/models/History';

export async function GET(request: Request) {
  try {
    await dbConnect();

    // To ensure models are registered
    const TeamModel = Team;
    const MatchModel = Match;
    const PredictionModel = Prediction;
    const HistoryModel = History;

    const teams = await TeamModel.find();
    const matches = await MatchModel.find()
      .populate('homeTeam')
      .populate('awayTeam')
      .populate('prediction');

    const predictions = await PredictionModel.find().populate('matchId');

    
    const histories = await HistoryModel.find();


    return NextResponse.json({ 
        message: "Data check complete. See the data below.",
        teamsCount: teams.length,
        matchesCount: matches.length,
        predictionsCount: predictions.length,
        historiesCount: histories.length,
        matches,
        predictions,
        teams,
        histories,
    });
  } catch (error: any) {
    console.error('Failed to fetch debug data:', error);
    return NextResponse.json({ message: 'Internal ServerError', error: error.message }, { status: 500 });
  }
}
