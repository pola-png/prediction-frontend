
'use server';

import type { Match } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import { generateMatchPredictions, type GenerateMatchPredictionsInput } from '@/ai/flows/generate-match-predictions';
import { getMatchStats, type MatchStats } from '@/services/match-stats-service';
import { getPredictionParameters, type GetPredictionParametersInput, type PredictionParameters } from '@/ai/flows/get-prediction-parameters';
import { ZodError } from 'zod';

function sanitizeObject<T>(obj: any): T {
    const str = JSON.stringify(obj);
    return JSON.parse(str) as T;
}


export async function getAndGeneratePredictions(matches: Match[]): Promise<void> {
  for (const match of matches) {
    let stats: MatchStats;
    try {
      console.log(`Fetching stats for match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      stats = await getMatchStats(match);
       console.log(`Stats for ${match.homeTeam.name} vs ${match.awayTeam.name}:`, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error(`Failed to get match stats for match ${match._id}:`, error);
      continue; 
    }

    let parameters: PredictionParameters;
    try {
      console.log(`Fetching prediction parameters for match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      const paramsInput: GetPredictionParametersInput = {
        matchDetails: `${match.homeTeam.name} vs ${match.awayTeam.name} in the ${match.leagueCode}`,
      };
      parameters = await getPredictionParameters(paramsInput);
    } catch (error) {
      console.error(`Failed to get prediction parameters for match ${match._id}:`, error);
      continue;
    }

    try {
      console.log(`Generating prediction for match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      const predictionInput: GenerateMatchPredictionsInput = {
        ...parameters,
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
      await MatchModel.findByIdAndUpdate(match._id, { prediction: prediction._id });
      console.log(`Successfully generated and saved prediction for match ${match._id}`);

    } catch (error) {
      if (error instanceof ZodError) {
        console.error(`Validation error for match prediction ${match._id}:`, JSON.stringify(error.errors, null, 2));
      } else {
        console.error(`Failed to generate or save prediction for match ${match._id}:`, error);
      }
    }
  }
}


export async function getUpcomingMatches(limit = 15): Promise<Match[]> {
    await dbConnect();

    const initialMatches: Match[] = await MatchModel.find({
        status: 'scheduled',
        matchDateUtc: { $gte: new Date() }
    })
    .populate({ path: 'homeTeam', model: TeamModel })
    .populate({ path: 'awayTeam', model: TeamModel })
    .sort({ matchDateUtc: 1 })
    .limit(limit)
    .lean({ virtuals: true });
    
    const matchesToPredict = initialMatches.filter(m => !m.prediction);
    
    if (matchesToPredict.length > 0) {
        console.log(`Found ${matchesToPredict.length} matches without predictions. Generating now...`);
        await getAndGeneratePredictions(matchesToPredict);
        
        const finalMatches: Match[] = await MatchModel.find({
            _id: { $in: initialMatches.map(m => m._id) }
        })
        .populate({ path: 'homeTeam', model: TeamModel })
        .populate({ path: 'awayTeam', model: TeamModel })
        .populate({ path: 'prediction', model: PredictionModel })
        .sort({ matchDateUtc: 1 })
        .lean({ virtuals: true });

        return sanitizeObject(finalMatches);
    }

    const matchesWithPredictions = await MatchModel.find({
        _id: { $in: initialMatches.map(m => m._id) }
    })
    .populate({ path: 'homeTeam', model: TeamModel })
    .populate({ path: 'awayTeam', model: TeamModel })
    .populate({ path: 'prediction', model: PredictionModel })
    .sort({ matchDateUtc: 1 })
    .lean({ virtuals: true });


    return sanitizeObject(matchesWithPredictions);
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
