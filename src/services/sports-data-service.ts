
'use server';

import type { Match } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import { generateMatchPredictions, type GenerateMatchPredictionsInput } from '@/ai/flows/generate-match-predictions';
import { getMatchStats, type MatchStats } from '@/services/match-stats-service';
import { ZodError } from 'zod';

function sanitizeObject<T>(obj: any): T {
    const str = JSON.stringify(obj);
    return JSON.parse(str) as T;
}


async function getAndGeneratePredictions(matches: Match[]): Promise<Match[]> {
  const matchesWithPredictions: Match[] = [];

  for (const match of matches) {
    try {
        console.log(`Generating prediction for match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
        const stats: MatchStats = await getMatchStats(match);

        const predictionInput: GenerateMatchPredictionsInput = {
            teamFormWeight: 0.4,
            h2hWeight: 0.3,
            homeAdvWeight: 0.2,
            goalsWeight: 0.1,
            matchDetails: `${match.homeTeam.name} vs ${match.awayTeam.name} in the ${match.leagueCode}`,
            teamAForm: stats.teamA.form,
            teamBForm: stats.teamB.form,
            headToHeadStats: stats.h2h,
            teamAGoals: stats.teamA.goals,
            teamBGoals: stats.teamB.goals,
        };
      
      const predictionResult = await generateMatchPredictions(predictionInput);

      const prediction = new PredictionModel({
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

      await prediction.save();
      
      const updatedMatch = { ...match, prediction: sanitizeObject(prediction) };
      await MatchModel.findByIdAndUpdate(match._id, { prediction: prediction._id });

      matchesWithPredictions.push(updatedMatch);

    } catch (error) {
       if (error instanceof ZodError) {
        console.error(`Validation error for match ${match._id}:`, JSON.stringify(error.errors, null, 2));
      } else {
        console.error(`Failed to generate or save prediction for match ${match._id}:`, error);
      }
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
    let finalMatches: Match[] = upcomingMatches;
    
    if (matchesToPredict.length > 0) {
        console.log(`Found ${matchesToPredict.length} matches without predictions. Generating now...`);
        const predictions = await getAndGeneratePredictions(matchesToPredict);
        const predictionMap = new Map(predictions.map(p => [p._id.toString(), p.prediction]));

        finalMatches = upcomingMatches.map(match => {
            const matchIdStr = match._id.toString();
            if (predictionMap.has(matchIdStr) && predictionMap.get(matchIdStr)) {
                return { ...match, prediction: predictionMap.get(matchIdStr)! };
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

    return sanitizeObject(allMatches);
}
