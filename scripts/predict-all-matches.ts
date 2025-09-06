
import 'dotenv/config';
import dbConnect from '@/lib/mongodb';
import MatchModel from '@/models/Match';
import { getAndGeneratePredictions } from '@/services/sports-data-service';

async function predictAllUpcomingMatches() {
  await dbConnect();
  console.log('Fetching all upcoming matches from the database...');

  const upcomingMatches = await MatchModel.find({
    status: 'scheduled',
    matchDateUtc: { $gte: new Date() },
    prediction: { $exists: false } // Only fetch matches that do not have a prediction
  }).populate('homeTeam').populate('awayTeam').lean();

  if (upcomingMatches.length === 0) {
    console.log('No upcoming matches found that need a prediction. The database is up-to-date.');
    process.exit(0);
  }

  console.log(`Found ${upcomingMatches.length} upcoming matches that need predictions. Starting generation...`);
  
  // The type assertion is needed here because the lean object is not fully compatible with the Mongoose document type
  // that getAndGeneratePredictions might implicitly expect in some cases, even with lean().
  await getAndGeneratePredictions(upcomingMatches as any);

  console.log('Prediction generation process completed for all fetched matches.');
  process.exit(0);
}

predictAllUpcomingMatches().catch(err => {
  console.error('An error occurred during the prediction process:', err);
  process.exit(1);
});
