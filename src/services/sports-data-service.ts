
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Team from '@/models/Team';
import Prediction from '@/models/Prediction';
import { getPredictionParameters } from '@/ai/flows/get-prediction-parameters';
import { calculateMatchStats } from '@/ai/flows/calculate-match-stats';
import { generateMatchPredictions } from '@/ai/flows/generate-match-predictions';
import type { Match as MatchType, Prediction as PredictionType } from '@/lib/types';
import { sanitizeObject } from '@/lib/utils';
import axios from 'axios';

async function getOrCreateTeam(name: string): Promise<any> {
    let team = await Team.findOne({ name });
    if (!team) {
        team = await Team.create({ name });
    }
    return team;
}

export async function fetchAndStoreMatches() {
    await dbConnect();
    let newMatchesCount = 0;
    let newHistoryCount = 0;

    // 1. Fetch live/upcoming matches from Soccer’sAPI
    try {
        const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
            params: {
                user: process.env.SOCCERSAPI_USER,
                token: process.env.SOCCERSAPI_TOKEN,
                t: "upcoming",
            },
        });

        const liveMatches = soccerRes.data.data || [];
        console.log(`Fetched ${liveMatches.length} matches from SoccersAPI.`);

        for (const matchData of liveMatches) {
            if (!matchData.id || !matchData.home || !matchData.away) continue;

            const existingMatch = await Match.findOne({ externalId: String(matchData.id) });
            if (existingMatch) continue;

            const homeTeam = await getOrCreateTeam(matchData.home.name);
            const awayTeam = await getOrCreateTeam(matchData.away.name);

            await Match.create({
                source: 'soccersapi',
                externalId: String(matchData.id),
                leagueCode: matchData.league.name,
                matchDateUtc: new Date(matchData.date_time),
                status: matchData.status,
                homeTeam: homeTeam._id,
                awayTeam: awayTeam._id,
            });
            newMatchesCount++;
        }
        console.log(`Added ${newMatchesCount} new live matches.`);
    } catch (error) {
        console.error("Error fetching from SoccersAPI:", error);
    }

    // 2. Fetch historical matches from football.json
    try {
        const fallbackRes = await axios.get(process.env.FOOTBALL_JSON_URL!);
        const history = fallbackRes.data.matches || [];
        console.log(`Fetched ${history.length} historical matches.`);

        for (const matchData of history) {
            if (!matchData.team1 || !matchData.team2 || !matchData.date) continue;
            
            const externalId = `${matchData.date}-${matchData.team1}-${matchData.team2}`;
            const existingMatch = await Match.findOne({ externalId });
            if (existingMatch) continue;

            const homeTeam = await getOrCreateTeam(matchData.team1);
            const awayTeam = await getOrCreateTeam(matchData.team2);

            await Match.create({
                source: 'footballjson',
                externalId,
                leagueCode: 'Premier League 23/24 History',
                matchDateUtc: new Date(matchData.date),
                status: 'finished',
                homeTeam: homeTeam._id,
                awayTeam: awayTeam._id,
                homeGoals: matchData.score.ft[0],
                awayGoals: matchData.score.ft[1],
            });
            newHistoryCount++;
        }
        console.log(`Added ${newHistoryCount} new historical matches.`);
    } catch (error) {
        console.error("Error fetching from football.json:", error);
    }

    return { newMatchesCount, newHistoryCount };
}


export async function getAndGeneratePredictions(upcomingMatches: MatchType[]): Promise<void> {
    await dbConnect();
    // Ensure models are registered
    Team;
    Prediction;

    const historicalMatches: MatchType[] = sanitizeObject(await Match.find({ status: 'finished' }).populate('homeTeam').populate('awayTeam'));

    const historicalMatchData = historicalMatches.map(m => ({
        date: m.matchDateUtc,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeGoals: m.homeGoals!,
        awayGoals: m.awayGoals!,
    }));

    for (const match of upcomingMatches) {
        try {
            console.log(`Processing match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
            const matchDetails = `${match.homeTeam.name} vs ${match.awayTeam.name} in the ${match.leagueCode}`;

            // Step 1: Get dynamic prediction parameters
            const params = await getPredictionParameters({ matchDetails });
            console.log('  - Got prediction parameters:', params);

            // Step 2: Calculate stats from historical data
            const stats = await calculateMatchStats({
                teamAName: match.homeTeam.name,
                teamBName: match.awayTeam.name,
                matches: historicalMatchData
            });
            console.log('  - Calculated match stats:', stats);

            // Step 3: Generate the final prediction
            const predictionResult = await generateMatchPredictions({
                ...params,
                ...stats,
                matchDetails,
            });
            console.log('  - Generated prediction:', predictionResult.bucket, `Confidence: ${predictionResult.confidence}%`);

            // Step 4: Save the prediction and link it to the match
            const predictionDoc = new Prediction({
                matchId: match._id,
                features: params,
                outcomes: predictionResult,
                confidence: predictionResult.confidence,
                bucket: predictionResult.bucket,
                version: '1.0-genkit'
            });
            await predictionDoc.save();

            await Match.updateOne({ _id: match._id }, { $set: { prediction: predictionDoc._id } });

            console.log(`  - Successfully saved prediction for match ${match._id}`);
        } catch (error) {
            console.error(`Failed to process match ${match._id}:`, error);
        }
    }
}
