
'use server';

import 'dotenv/config';
import dbConnect from '@/lib/mongodb';
import MatchModel, { type IMatch } from '@/models/Match';
import PredictionModel, { type IPrediction } from '@/models/Prediction';
import HistoryModel from '@/models/History';

export async function processResults() {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected.');

    // Find finished matches that have a prediction but have not been processed yet
    const finishedMatches: IMatch[] = await MatchModel.find({
        status: 'finished',
        prediction: { $exists: true, $ne: null },
    })
    .populate('prediction')
    .lean();
    
    let processedCount = 0;

    if (finishedMatches.length === 0) {
        console.log('No new finished matches with predictions to process.');
        return { processedCount };
    }
    
    console.log(`Found ${finishedMatches.length} finished matches with predictions to process.`);

    for (const match of finishedMatches) {
        const existingHistory = await HistoryModel.findOne({ matchId: match._id });
        if (existingHistory) {
            continue; // Skip if already processed
        }

        console.log(`Processing match: ${match._id}`);

        const prediction = match.prediction as IPrediction;
        if (!prediction) {
            console.log(`  -> Skipping match ${match._id}, prediction object not populated correctly.`);
            continue;
        }

        const { homeGoals, awayGoals } = match;
        if (typeof homeGoals !== 'number' || typeof awayGoals !== 'number') {
             console.log(`  -> Skipping match ${match._id} due to missing score.`);
            continue;
        }
        
        const actualOutcome = homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw';
        const predictedOutcome = 
            prediction.outcomes.oneXTwo.home > prediction.outcomes.oneXTwo.away && prediction.outcomes.oneXTwo.home > prediction.outcomes.oneXTwo.draw ? 'home' :
            prediction.outcomes.oneXTwo.away > prediction.outcomes.oneXTwo.home && prediction.outcomes.oneXTwo.away > prediction.outcomes.oneXTwo.draw ? 'away' : 'draw';


        const totalGoals = homeGoals + awayGoals;

        const historyRecord = new HistoryModel({
            matchId: match._id,
            predictionId: prediction._id,
            resolvedAt: new Date(),
            result: {
                homeGoals,
                awayGoals,
                outcome: actualOutcome,
                over15: totalGoals > 1.5,
                over25: totalGoals > 2.5,
                bttsYes: homeGoals > 0 && awayGoals > 0,
            },
            correctness: {
                oneXTwo: predictedOutcome === actualOutcome,
                over15: (prediction.outcomes.over15 > 0.5) === (totalGoals > 1.5),
                over25: (prediction.outcomes.over25 > 0.5) === (totalGoals > 2.5),
                bttsYes: (prediction.outcomes.bttsYes > 0.5) === (homeGoals > 0 && awayGoals > 0),
            }
        });

        await historyRecord.save();
        processedCount++;
        console.log(`  -> Saved history for match ${match._id}`);
    }

    console.log(`Result processing complete. Processed ${processedCount} new results.`);
    return { processedCount };
}
