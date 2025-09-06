
'use server';

import type { Match, Team, Prediction } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import { generateMatchPredictions, type GenerateMatchPredictionsInput } from '@/ai/flows/generate-match-predictions';

function sanitizeObject<T>(obj: any): T {
    return JSON.parse(JSON.stringify(obj));
}

async function getAndGeneratePredictions(matches: Match[]): Promise<Match[]> {
  await dbConnect();
  const matchesWithPredictions: Match[] = [];

  for (const match of matches) {
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
        matchDetails: `${match.homeTeam.name} vs ${match.awayTeam.name} on ${match.matchDateUtc} in the ${match.leagueCode}`,
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

      const plainPrediction: Prediction = sanitizeObject(savedPrediction);
      const fullMatch = { ...match, prediction: plainPrediction };
      matchesWithPredictions.push(fullMatch);
      
    } catch (error) {
      console.error(`Failed to generate or save prediction for match ${match._id}:`, error);
      // Still push the match without a prediction if the AI call fails
      matchesWithPredictions.push(match);
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
    .populate({ path: 'homeTeam', model: TeamModel })
    .populate({ path: 'awayTeam', model: TeamModel })
    .populate({ path: 'prediction', model: PredictionModel })
    .sort({ matchDateUtc: 1 })
    .limit(limit)
    .lean({ virtuals: true });

    const matchesToPredict = upcomingMatches.filter(m => !m.prediction);
    let finalMatches = upcomingMatches;
    
    if (matchesToPredict.length > 0) {
        console.log(`Found ${matchesToPredict.length} matches without predictions. Generating now...`);
        const predictions = await getAndGeneratePredictions(matchesToPredict);
        const predictionMap = new Map(predictions.map(p => [p._id.toString(), p.prediction]));

        finalMatches = upcomingMatches.map(match => {
            const matchIdStr = match._id.toString();
            if (predictionMap.has(matchIdStr) && predictionMap.get(matchIdStr)) {
                return { ...match, prediction: predictionMap.get(matchIdStr) };
            }
            return match;
        }) as Match[];
    }

    return sanitizeObject(finalMatches);
}

export async function getAllMatches(): Promise<Match[]> {
    await dbConnect();

    const allMatches: Match[] = await MatchModel.find({})
        .populate({ path: 'homeTeam', model: TeamModel })
        .populate({ path: 'awayTeam', model: TeamModel })
        .populate({ path: 'prediction', model: PredictionModel })
        .sort({ matchDateUtc: -1 })
        .limit(200)
        .lean({ virtuals: true });

    const matchesToPredict = allMatches.filter(m => !m.prediction && m.status === 'scheduled');
    let finalMatches = allMatches;

    if (matchesToPredict.length > 0) {
        console.log(`Found ${matchesToPredict.length} matches on debug page without predictions. Generating now...`);
        const predictions = await getAndGeneratePredictions(matchesToPredict);
        const predictionMap = new Map(predictions.map(p => [p._id.toString(), p.prediction]));

        finalMatches = allMatches.map(match => {
            const matchIdStr = match._id.toString();
            if (predictionMap.has(matchIdStr) && predictionMap.get(matchIdStr)) {
                return { ...match, prediction: predictionMap.get(matchIdStr) };
            }
            return match;
        }) as Match[];
    }

    return sanitizeObject(finalMatches);
}
