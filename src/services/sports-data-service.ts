
'use server';

import type { Match, Team, Prediction } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import { generateMatchPredictions, type GenerateMatchPredictionsInput } from '@/ai/flows/generate-match-predictions';
import { ZodError } from 'zod';


function sanitizeObject<T>(obj: any): T {
    const str = JSON.stringify(obj);
    return JSON.parse(str) as T;
}

// This function is temporarily disabled to ensure application stability.
// We will re-enable and fix prediction generation in a future step.
async function getAndGeneratePredictions(matches: Match[]): Promise<Match[]> {
  console.log("Prediction generation is temporarily disabled.");
  return matches;
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
    
    // Temporarily disabled prediction generation
    // const matchesToPredict = upcomingMatches.filter(m => !m.prediction);
    // let finalMatches = upcomingMatches;
    
    // if (matchesToPredict.length > 0) {
    //     console.log(`Found ${matchesToPredict.length} matches without predictions. Generating now...`);
    //     const predictions = await getAndGeneratePredictions(matchesToPredict);
    //     const predictionMap = new Map(predictions.map(p => [p._id.toString(), p.prediction]));

    //     finalMatches = upcomingMatches.map(match => {
    //         const matchIdStr = match._id.toString();
    //         if (predictionMap.has(matchIdStr) && predictionMap.get(matchIdStr)) {
    //             return { ...match, prediction: predictionMap.get(matchIdStr) };
    //         }
    //         return match;
    //     }) as Match[];
    // }

    return sanitizeObject(upcomingMatches);
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

    // Temporarily disabled prediction generation
    // const matchesToPredict = allMatches.filter(m => !m.prediction && m.status === 'scheduled');
    // let finalMatches = allMatches;

    // if (matchesToPredict.length > 0) {
    //     console.log(`Found ${matchesToPredict.length} matches on debug page without predictions. Generating now...`);
    //     const predictions = await getAndGeneratePredictions(matchesToPredict);
    //     const predictionMap = new Map(predictions.map(p => [p._id.toString(), p.prediction]));

    //     finalMatches = allMatches.map(match => {
    //         const matchIdStr = match._id.toString();
    //         if (predictionMap.has(matchIdStr) && predictionMap.get(matchIdStr)) {
    //             return { ...match, prediction: predictionMap.get(matchIdStr) };
    //         }
    //         return match;
    //     }) as Match[];
    // }

    return sanitizeObject(allMatches);
}
