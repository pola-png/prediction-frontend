
import 'dotenv/config';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import type { Match } from '@/lib/types';
import { getAndGeneratePredictions } from '@/services/sports-data-service';


async function main() {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected.');

    // Ensure models are registered
    const Team = TeamModel;
    const Prediction = PredictionModel;

    // 1. Find all upcoming matches
    const upcomingMatches: Match[] = await MatchModel.find({
        status: 'scheduled',
        matchDateUtc: { $gte: new Date() },
        prediction: { $exists: false } // Only fetch matches that DO NOT have a prediction
    })
    .populate('homeTeam')
    .populate('awayTeam')
    .sort({ matchDateUtc: 1 })
    .lean();

    if (upcomingMatches.length === 0) {
        console.log('All upcoming matches already have predictions. No action needed.');
        process.exit(0);
    }
    
    console.log(`Found ${upcomingMatches.length} upcoming matches that need predictions.`);

    // 2. Generate predictions for them
    await getAndGeneratePredictions(upcomingMatches);

    console.log('Prediction generation process complete.');
    process.exit(0);
}

main().catch(err => {
    console.error('An error occurred during the prediction script:', err);
    process.exit(1);
});
