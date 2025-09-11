
const axios = require('axios');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { getPredictionFromAI } = require('./aiService');


async function getOrCreateTeam(name) {
    let team = await Team.findOne({ name });
    if (!team) {
        team = await Team.create({ name });
    }
    return team;
}

async function fetchAndStoreMatches() {
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
        console.log(`CRON: Fetched ${liveMatches.length} matches from SoccersAPI.`);

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
    } catch (error) {
        console.error("CRON: Error fetching from SoccersAPI:", error.message);
    }

    // 2. Fetch historical matches from football.json
    try {
        const fallbackRes = await axios.get(process.env.FOOTBALL_JSON_URL);
        const history = fallbackRes.data.matches || [];
        console.log(`CRON: Fetched ${history.length} historical matches.`);

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
    } catch (error) {
        console.error("CRON: Error fetching from football.json:", error.message);
    }

    return { newMatchesCount, newHistoryCount };
}

async function generateAllPredictions() {
    let processedCount = 0;
    const upcomingMatches = await Match.find({
        status: { $in: ['scheduled', 'upcoming', 'tba'] },
        matchDateUtc: { $gte: new Date() },
        prediction: { $exists: false }
    }).populate('homeTeam awayTeam').lean();
    
    if (upcomingMatches.length === 0) {
        console.log("CRON: No matches need predictions.");
        return { processedCount: 0 };
    }
    
    const historicalMatches = await Match.find({ status: 'finished' }).populate('homeTeam awayTeam').lean();

    for (const match of upcomingMatches) {
        try {
            const predictionResult = await getPredictionFromAI(match, historicalMatches);
            
            const predictionDoc = new Prediction({
                matchId: match._id,
                outcomes: predictionResult,
                confidence: predictionResult.confidence,
                bucket: predictionResult.bucket,
                version: '1.0-express'
            });
            await predictionDoc.save();

            await Match.updateOne({ _id: match._id }, { $set: { prediction: predictionDoc._id } });
            processedCount++;
            console.log(`CRON: Generated prediction for ${match.homeTeam.name} vs ${match.awayTeam.name}`);
        } catch (error) {
            console.error(`CRON: Failed to generate prediction for match ${match._id}:`, error.message);
        }
    }
    return { processedCount };
}

async function fetchAndStoreResults() {
    let updatedCount = 0;
    try {
        const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
            params: {
                user: process.env.SOCCERSAPI_USER,
                token: process.env.SOCCERSAPI_TOKEN,
                t: "results",
            },
        });

        const results = soccerRes.data.data || [];
        console.log(`CRON: Fetched ${results.length} results from SoccersAPI.`);

        for (const matchResult of results) {
            if (!matchResult.id || !matchResult.score || matchResult.status !== 'finished') continue;
            const [homeGoals, awayGoals] = matchResult.score.ft_score.split('-').map(Number);
            const updated = await Match.findOneAndUpdate(
                { externalId: String(matchResult.id) },
                {
                    $set: { status: 'finished', homeGoals, awayGoals, updatedAt: new Date() }
                },
                { new: true }
            );
            if(updated) {
                updatedCount++;
            }
        }
    } catch (error) {
        console.error("CRON: Fetching results failed:", error.message);
    }
    return { updatedCount };
}

module.exports = {
    fetchAndStoreMatches,
    generateAllPredictions,
    fetchAndStoreResults
};
