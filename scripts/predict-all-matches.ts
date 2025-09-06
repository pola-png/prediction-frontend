import 'dotenv/config';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import { getAndGeneratePredictions } from '@/services/sports-data-service';
import type { Match } from '@/lib/types';

async function predictAllMatches() {
    console.log('Starting prediction process for all matches...');
    await dbConnect();

    // Ensure models are registered (important for Mongoose)
    const Team = TeamModel;
    const Match = MatchModel;
    const Prediction = PredictionModel;

    try {
        const matchesWithoutPrediction: Match[] = await MatchModel.find({ 
            prediction: { $exists: false },
            status: 'scheduled'
        })
        .populate('homeTeam')
        .populate('awayTeam')
        .lean();

        if (matchesWithoutPrediction.length === 0) {
            console.log('All scheduled matches already have predictions. Exiting.');
            return;
        }

        console.log(`Found ${matchesWithoutPrediction.length} scheduled matches without predictions. Generating now...`);

        await getAndGeneratePredictions(matchesWithoutPrediction);

        console.log('Successfully generated predictions for all remaining scheduled matches.');

    } catch (error) {
        console.error('An error occurred during the prediction generation process:', error);
    } finally {
        process.exit(0);
    }
}

predictAllMatches();
