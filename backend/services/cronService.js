
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

// Helper to get the current season for OpenLigaDB (e.g., 2023 for 2023/2024 season)
function getCurrentSeason() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    // Season usually starts around July/August
    return month >= 7 ? year : year - 1;
}

async function fetchFromSoccersAPI() {
    let newMatchesCount = 0;
    let updatedMatchesCount = 0;
    const { SOCCERSAPI_USER, SOCCERSAPI_TOKEN } = process.env;
    if (!SOCCERSAPI_USER || !SOCCERSAPI_TOKEN) {
        throw new Error("SoccersAPI credentials not found in environment variables.");
    }

    // Fetch matches for today
    const today = new Date().toISOString().split('T')[0];
    const url = `https://www.soccersapi.com/v2.2/fixtures?user=${SOCCERSAPI_USER}&token=${SOCCERSAPI_TOKEN}&t=schedule&d=${today}`;
    
    const response = await axios.get(url);
    const liveMatches = response.data.data || [];
    console.log(`CRON: Fetched ${liveMatches.length} matches for ${today} from SoccersAPI.`);

    for (const matchData of liveMatches) {
        if (!matchData.id) continue;

        const externalId = `soccersapi-${matchData.id}`;
        const existingMatch = await Match.findOne({ externalId });

        const homeTeam = await getOrCreateTeam(matchData.home_name);
        const awayTeam = await getOrCreateTeam(matchData.away_name);

        if (!homeTeam || !awayTeam) continue;

        const matchDateTime = new Date(`${matchData.date} ${matchData.time}`);

        if (existingMatch) {
            // SoccersAPI does not provide a last updated timestamp, so updates are more complex.
            // For now, we will skip if it exists. A more robust solution might compare fields.
            continue; 
        } else {
            await Match.create({
                source: 'soccersapi',
                externalId: externalId,
                leagueCode: matchData.league_name,
                matchDateUtc: matchDateTime,
                status: 'scheduled',
                homeTeam: homeTeam._id,
                awayTeam: awayTeam._id,
            });
            newMatchesCount++;
        }
    }
    return { newMatchesCount, updatedMatchesCount };
}

async function fetchFromOpenLigaDB() {
    let newMatchesCount = 0;
    let updatedMatchesCount = 0;
    const leagueShortcuts = ['bl1', 'bl2'];
    const currentSeason = getCurrentSeason();

    for (const league of leagueShortcuts) {
        const openLigaRes = await axios.get(`https://api.openligadb.de/getmatchdata/${league}/${currentSeason}`);
        const liveMatches = openLigaRes.data || [];
        console.log(`CRON: Fetched ${liveMatches.length} matches for league ${league} for season ${currentSeason} from OpenLigaDB.`);

        for (const matchData of liveMatches) {
            if (!matchData.matchID) continue;
            
            const externalId = `openliga-${matchData.matchID}`;
            const existingMatch = await Match.findOne({ externalId });

            const homeTeam = await getOrCreateTeam(matchData.team1.teamName);
            const awayTeam = await getOrCreateTeam(matchData.team2.teamName);

            if (!homeTeam || !awayTeam) continue;

            const matchDateTime = new Date(matchData.matchDateTimeUTC);
            const lastUpdateDate = new Date(matchData.lastUpdateDateTimeUTC);

            if (existingMatch) {
                const existingLastUpdate = new Date(existingMatch.updatedAt);
                if (lastUpdateDate > existingLastUpdate) {
                     await Match.updateOne({ _id: existingMatch._id }, {
                        $set: {
                            matchDateUtc: matchDateTime,
                            status: matchData.matchIsFinished ? 'finished' : 'scheduled',
                            homeGoals: matchData.matchResults.find(r => r.resultName === 'Endergebnis')?.pointsTeam1,
                            awayGoals: matchData.matchResults.find(r => r.resultName === 'Endergebnis')?.pointsTeam2,
                            updatedAt: lastUpdateDate
                        }
                    });
                    updatedMatchesCount++;
                }
            } else {
                await Match.create({
                    source: 'openligadb',
                    externalId: externalId,
                    leagueCode: matchData.leagueName,
                    matchDateUtc: matchDateTime,
                    status: matchData.matchIsFinished ? 'finished' : 'scheduled',
                    homeTeam: homeTeam._id,
                    awayTeam: awayTeam._id,
                    homeGoals: matchData.matchResults.find(r => r.resultName === 'Endergebnis')?.pointsTeam1,
                    awayGoals: matchData.matchResults.find(r => r.resultName === 'Endergebnis')?.pointsTeam2,
                    updatedAt: lastUpdateDate,
                });
                newMatchesCount++;
            }
        }
    }
    return { newMatchesCount, updatedMatchesCount };
}


async function fetchAndStoreMatches() {
    let newMatchesCount = 0;
    let updatedMatchesCount = 0;
    let newHistoryCount = 0;

    // 1. Try fetching from primary source: SoccersAPI
    try {
        console.log("CRON: Attempting to fetch from primary source: SoccersAPI");
        const soccersApiResult = await fetchFromSoccersAPI();
        newMatchesCount += soccersApiResult.newMatchesCount;
        updatedMatchesCount += soccersApiResult.updatedMatchesCount;
    } catch (error) {
        console.error("CRON: Primary source SoccersAPI failed:", error.message);
        console.log("CRON: Falling back to secondary source: OpenLigaDB");
        // 2. Fallback to OpenLigaDB
        try {
            const openLigaResult = await fetchFromOpenLigaDB();
            newMatchesCount += openLigaResult.newMatchesCount;
            updatedMatchesCount += openLigaResult.updatedMatchesCount;
        } catch (fallbackError) {
            console.error("CRON: Fallback source OpenLigaDB also failed:", fallbackError.message);
        }
    }

    // 3. Fetch historical matches from football.json
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


    return { newMatchesCount, updatedMatchesCount, newHistoryCount };
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
                version: '1.2-soccersapi'
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
        source: 'openligadb' // Only check for results from OpenLigaDB for now
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
