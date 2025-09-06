
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Prediction from '@/models/Prediction';
import Team from '@/models/Team';
import History from '@/models/History';

export async function GET(request: Request) {
  try {
    console.log('Connecting to DB to clear data...');
    await dbConnect();
    console.log('DB connected. Clearing collections...');

    const deletedMatches = await Match.deleteMany({});
    const deletedTeams = await Team.deleteMany({});
    const deletedPredictions = await Prediction.deleteMany({});
    const deletedHistories = await History.deleteMany({});

    const message = `Database cleared successfully. Removed ${deletedMatches.deletedCount} matches, ${deletedTeams.deletedCount} teams, ${deletedPredictions.deletedCount} predictions, and ${deletedHistories.deletedCount} history records.`;
    console.log(message);

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Failed to clear database:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
