
import type { Match, Team, Prediction } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import HistoryModel from '@/models/History';
import { generateMatchPredictions, type GenerateMatchPredictionsInput } from '@/ai/flows/generate-match-predictions';


async function getAndGeneratePredictions(matches: Match[]): Promise<Match[]> {
  await dbConnect();
  const matchesWithPredictions: Match[] = [];

  for (const match of matches) {
    // This match object is already a lean object, but we might be re-populating it later.
    // The core check `if (match.prediction)` still works.
    if (match.prediction) {
      matchesWithPredictions.push(match);
      continue;
    }
    
    try {
      console.log(`Generating prediction for match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      const predictionInput: GenerateMatchPredictionsInput = {
        teamFormWeight: 0.4,
        h2hWeight: 0.3,
        homeAdvWeight: 0.2,
        goalsWeight: 0.1,
        matchDetails: `${match.homeTeam.name} vs ${match.awayTeam.name} on ${match.matchDateUtc}`,
        teamAForm: 'Not available',
        teamBForm: 'Not available',
        headToHeadStats: 'Not available',
        teamAGoals: 'Not available',
        teamBGoals: 'Not available',
      };

      const predictionResult = await generateMatchPredictions(predictionInput);

      const newPrediction = new PredictionModel({
        matchId: match._id,
        version: '1.0',
        features: {
            teamFormWeight: predictionInput.teamFormWeight,
            h2hWeight: predictionInput.h2hWeight,
            homeAdvWeight: predictionInput.homeAdvWeight,
            goalsWeight: predictionInput.goalsWeight,
        },
        outcomes: predictionResult,
        confidence: predictionResult.confidence,
        bucket: predictionResult.bucket,
      });

      const savedPrediction = await newPrediction.save();

      await MatchModel.findByIdAndUpdate(match._id, { prediction: savedPrediction._id });

      // Convert the newly created prediction to a plain object before attaching it.
      const fullPrediction: Prediction = savedPrediction.toObject({ virtuals: true });
      const fullMatch = { ...match, prediction: fullPrediction };
      matchesWithPredictions.push(fullMatch);
      
    } catch (error) {
      console.error(`Failed to generate or save prediction for match ${match._id}:`, error);
      matchesWithPredictions.push(match); // Push original match if prediction fails
    }
  }

  return matchesWithPredictions;
}


export async function getUpcomingMatches(limit = 15): Promise<Match[]> {
    await dbConnect();

    const upcomingMatches: Match[] = await MatchModel.find({
        status: 'scheduled',
        matchDateUtc: { $gte: new Date() }
    })
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('prediction')
    .sort({ matchDateUtc: 1 })
    .limit(limit)
    .lean(); // <-- This is the crucial fix!

    // Now that we have lean objects, we can process them.
    const matchesToPredict = upcomingMatches.filter(m => !m.prediction);
    
    if (matchesToPredict.length > 0) {
        const predictions = await getAndGeneratePredictions(matchesToPredict);
        // Create a map of predictions by match ID for easy lookup
        const predictionMap = new Map(predictions.map(p => [p._id.toString(), p.prediction]));

        // Merge the new predictions back into the original list
        const allMatches = upcomingMatches.map(match => {
            if (predictionMap.has(match._id.toString())) {
                return { ...match, prediction: predictionMap.get(match._id.toString()) };
            }
            return match;
        });
        return allMatches as Match[];
    }

    return upcomingMatches;
}
