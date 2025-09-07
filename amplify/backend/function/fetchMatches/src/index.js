/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["SOCCERS_API_USER","SOCCERS_API_TOKEN","MONGO_URI"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
const axios = require("axios");
const mongoose = require("mongoose");

const { Schema } = mongoose;

// Database connection
let conn = null;
const MONGO_URI = process.env.MONGO_URI;

// Mongoose Schemas (must be defined in each Lambda)
const TeamSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true, unique: true },
  logoUrl: String,
});

const MatchSchema = new Schema({
  source: String,
  externalId: { type: String, unique: true, sparse: true },
  leagueCode: String,
  matchDateUtc: Date,
  status: String,
  homeTeam: { type: Schema.Types.ObjectId, ref: "Team" },
  awayTeam: { type: Schema.Types.ObjectId, ref: "Team" },
  homeGoals: Number,
  awayGoals: Number,
  tags: [String],
  prediction: { type: Schema.Types.ObjectId, ref: "Prediction" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);


async function dbConnect() {
  if (conn == null) {
    conn = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    }).then(() => mongoose);
    await conn;
  }
  return conn;
}


async function getOrCreaeTeam(name) {
    let team = await Team.findOne({ name });
    if (!team) {
        team = await Team.create({ name });
    }
    return team;
}


exports.handler = async (event) => {
  try {
    await dbConnect();
    console.log("DB connected");

    // 1. Fetch live/upcoming matches from Soccer’sAPI
    const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
      params: {
        user: process.env.SOCCERS_API_USER,
        token: process.env.SOCCERS_API_TOKEN,
        t: "upcoming",
      },
    });

    const liveMatches = soccerRes.data.data || [];
    let newMatchesCount = 0;
    console.log(`Fetched ${liveMatches.length} matches from SoccersAPI.`);

    for (const matchData of liveMatches) {
        if (!matchData.id || !matchData.home || !matchData.away) continue;

        const existingMatch = await Match.findOne({ externalId: String(matchData.id) });
        if (existingMatch) continue;

        const homeTeam = await getOrCreaeTeam(matchData.home.name);
        const awayTeam = await getOrCreaeTeam(matchData.away.name);

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


    // 2. Fetch historical matches from football.json
    const fallbackRes = await axios.get(
      "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json"
    );
    const history = fallbackRes.data.matches || [];
    let newHistoryCount = 0;
    console.log(`Fetched ${history.length} historical matches.`);

    for (const matchData of history) {
        if (!matchData.team1 || !matchData.team2 || !matchData.date) continue;
        
        const externalId = `${matchData.date}-${matchData.team1}-${matchData.team2}`;
        const existingMatch = await Match.findOne({ externalId });
        if (existingMatch) continue;

        const homeTeam = await getOrCreaeTeam(matchData.team1);
        const awayTeam = await getOrCreaeTeam(matchData.team2);

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

    return { 
        statusCode: 200,
        body: JSON.stringify({ 
            success: true, 
            newLiveMatches: newMatchesCount, 
            newHistoryMatches: newHistoryCount 
        })
    };

  } catch (error) {
    console.error("Error fetching matches:", error.message);
    return { 
        statusCode: 500,
        body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
