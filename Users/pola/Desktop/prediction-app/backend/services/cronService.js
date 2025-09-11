
const axios = require('axios');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { getPredictionFromAI } = require('./aiService');


async function getOrCreateTeam(name) {
    if (!name) return null;
    let team = await Team.findOne({ name });
    if (!team) {
        team = await Team.create({ name });
    }
    return team;
}

async function fetchAndStoreMatches() {
    let newMatchesCount = 0;
    let newHistoryCount = 0;

    // 1. Fetch live/upcoming matches from OpenLigaDB (as soccersapi is not reliable)
    // We will fetch from a couple of top leagues like Bundesliga
    const leagueShortcuts = ['bl1', 'bl2']; 
    try {
        for (const league of leagueShortcuts) {
            const openLigaRes = await axios.get(`https://api.openligadb.de/getmatchdata/${league}`);
            const liveMatches = openLigaRes.data || [];
            console.log(`CRON: Fetched ${liveMatches.length} matches for league ${league} from OpenLigaDB.`);

            for (const matchData of liveMatches) {
                if (!matchData.matchID) continue;
                const externalId = `openliga-${matchData.matchID}`;
                const existingMatch = await Match.findOne({ externalId });
                if (existingMatch) continue;

                const homeTeam = await getOrCreateTeam(matchData.team1.teamName);
                const awayTeam = await getOrCreateTeam(matchData.team2.teamName);

                if (!homeTeam || !awayTeam) continue;

                await Match.create({
                    source: 'openligadb',
                    externalId: externalId,
                    leagueCode: matchData.leagueName,
                    matchDateUtc: new Date(matchData.matchDateTimeUTC),
                    status: 'scheduled',
                    homeTeam: homeTeam._id,
                    awayTeam: awayTeam._id,
                });
                newMatchesCount++;
            }
        }
    } catch (error) {
        console.error("CRON: Error fetching from OpenLigaDB:", error.message);
    }

    // 2. Fetch historical matches from football.json
    if (process.env.FOOTBALL_JSON_URL) {
        try {
            const fallbackRes = await axios.get(process.env.FOOTBALL_JSON_URL);
            const history = fallbackRes.data.matches || [];
            console.log(`CRON: Fetched ${history.length} historical matches.`);

            for (const matchData of history) {
                if (!matchData.team1 || !matchData.team2 || !matchData.date) continue;
                const externalId = `footballjson-${matchData.date}-${matchData.team1}-${matchData.team2}`;
                const existingMatch = await Match.findOne({ externalId });
                if (existingMatch) continue;

                const homeTeam = await getOrCreateTeam(matchData.team1);
                const awayTeam = await getOrCreateTeam(matchData.team2);
                
                if (!homeTeam || !awayTeam) continue;

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
    }


    return { newMatchesCount, newHistoryCount };
}

async function generateAllPredictions() {
    let processedCount = 0;
    const upcomingMatches = await Match.find({
        status: { $in: ['scheduled', 'upcoming', 'tba'] },
        matchDateUtc: { $gte: new Date() },
        prediction: { $exists: false }
    }).populate('homeTeam awayTeam').limit(10).lean(); // Limit to 10 to avoid hitting API rate limits
    
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
                version: '1.1-monorepo'
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
    // Find matches that are scheduled but their match time is in the past
    const matchesToCheck = await Match.find({
        status: 'scheduled',
        matchDateUtc: { $lt: new Date() },
        source: 'openligadb'
    });

    if(matchesToCheck.length === 0) {
        console.log("CRON: No results to fetch from OpenLigaDB.");
        return { updatedCount };
    }

    console.log(`CRON: Checking for results for ${matchesToCheck.length} matches.`);
    for(const match of matchesToCheck) {
        try {
            const openLigaId = match.externalId.replace('openliga-', '');
            const res = await axios.get(`https://api.openligadb.de/getmatchdata/${openLigaId}`);
            const matchResult = res.data;

            if (matchResult && matchResult.matchIsFinished) {
                const homeGoals = matchResult.matchResults.find(r => r.resultName === 'Endergebnis').pointsTeam1;
                const awayGoals = matchResult.matchResults.find(r => r.resultName === 'Endergebnis').pointsTeam2;
                
                await Match.updateOne({ _id: match._id }, {
                    $set: {
                        status: 'finished',
                        homeGoals,
                        awayGoals,
                        updatedAt: new Date(),
                    }
                });
                updatedCount++;
                console.log(`CRON: Updated result for match ${match.externalId}`);
            }

        } catch(error) {
            console.error(`CRON: Failed to fetch result for match ${match.externalId}:`, error.message);
        }
    }
    
    return { updatedCount };
}

module.exports = {
    fetchAndStoreMatches,
    generateAllPredictions,
    fetchAndStoreResults
};
