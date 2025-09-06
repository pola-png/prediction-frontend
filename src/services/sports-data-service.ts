
'use server';

import type { Match } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import HistoryModel from '@/models/History';
import { generateMatchPredictions, type GenerateMatchPredictionsInput } from '@/ai/flows/generate-match-predictions';
import { getMatchStats, type MatchStats } from '@/services/match-stats-service';
import { getPredictionParameters } from '@/ai/flows/get-prediction-parameters';
import { ZodError } from 'zod';
import { sanitizeObject } from '@/lib/utils';
import type { PredictionParameters, GetPredictionParametersInput } from '@/lib/types';

const PREDICTION_VERSION = 'v1.5';

export async function getAndGeneratePredictions(matches: Match[]): Promise<void> {
  console.log(`Starting prediction generation process for ${matches.length} matches. Version: ${PREDICTION_VERSION}`);
  
  for (const match of matches) {
    if(!match.homeTeam || !match.awayTeam) {
        console.warn(`Skipping match ${match._id} due to missing team data.`);
        continue;
    }

    const matchIdentifier = `[${match.homeTeam.name} vs ${match.awayTeam.name}] - ID: ${match._id}`;
    console.log(matchIdentifier);

    let stats: MatchStats;
    try {
      console.log(` -> Fetching stats...`);
      stats = await getMatchStats(match);
    } catch (error: any) {
      console.error(`[ERROR] ${matchIdentifier} - Failed to get match stats. Raw error:`, error);
      if (error.cause) console.error('Error cause:', error.cause);
      continue;
    }

    let parameters: PredictionParameters;
    try {
      console.log(` -> Fetching prediction parameters...`);
      const paramsInput: GetPredictionParametersInput = {
        matchDetails: `${match.homeTeam.name} vs ${match.awayTeam.name} in the ${match.leagueCode}`,
      };
      parameters = await getPredictionParameters(paramsInput);
       console.log(` -> Parameters fetched:`, parameters);
    } catch (error: any) {
      console.error(`[ERROR] ${matchIdentifier} - Failed to get prediction parameters. Raw error:`, error);
      if (error.cause) console.error('Error cause:', error.cause);
      continue;
    }

    try {
      console.log(` -> Generating prediction...`);
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
        version: PREDICTION_VERSION,
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
      console.log(` -> [SUCCESS] ${matchIdentifier} - Generated and saved prediction.`);

    } catch (error: any) {
      if (error instanceof ZodError) {
        console.error(`[ERROR] ${matchIdentifier} - Zod validation error for match prediction:`, JSON.stringify(error.errors, null, 2));
      } else {
        console.error(`[ERROR] ${matchIdentifier} - Failed to generate or save prediction. Raw error:`, error);
        if (error.cause) console.error('Error cause:', error.cause);
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
        console.log(`Found ${matchesToPredict.length} upcoming matches without predictions. Generating now...`);
        await getAndGeneratePredictions(matchesToPredict);
        
        const finalMatches: Match[] = await MatchModel.find({
            _id: { $in: initialMatches.map(m => m._id) }
        })
        .populate({ path: 'homeTeam', model: TeamModel })
        .populate({ path: 'awayTeam', model: TeamModel })
        .populate({ path: 'prediction', model: PredictionModel })
        .sort({ matchDateUtc: 1 })
        .lean({ virtuals: true });

        return sanitizeObject<Match[]>(finalMatches);
    }

    const matchesWithPredictions = await MatchModel.find({
        _id: { $in: initialMatches.map(m => m._id) }
    })
    .populate({ path: 'homeTeam', model: TeamModel })
    .populate({ path: 'awayTeam', model: TeamModel })
    .populate({ path: 'prediction', model: PredictionModel })
    .sort({ matchDateUtc: 1 })
    .lean({ virtuals: true });


    return sanitizeObject<Match[]>(matchesWithPredictions);
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

    return sanitizeObject<Match[]>(allMatches);
}


export async function getRecentResults(limit = 20): Promise<Match[]> {
    await dbConnect();
    // Ensure models are registered
    const History = HistoryModel;
    const Match = MatchModel;
    const Prediction = PredictionModel;
    const Team = TeamModel;

    const recentResults = await History.find()
      .sort({ resolvedAt: -1 })
      .limit(limit)
      .populate({
        path: 'matchId',
        populate: [
          { path: 'homeTeam' },
          { path: 'awayTeam' },
        ]
      })
      .populate({
        path: 'predictionId'
      })
      .lean();

      const transformedResults = recentResults.map((history: any) => {
        const match = history.matchId;
        if (!match) return null;
        match.prediction = history.predictionId;
        match.homeGoals = history.result.homeGoals;
        match.awayGoals = history.result.awayGoals;
        match.status = 'finished';
        return match;
      }).filter(Boolean); // filter out any null matches

    return sanitizeObject<Match[]>(transformedResults as Match[]);
}
