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
const aws = require('aws-sdk');

const { Schema } = mongoose;

// --- Mongoose Schemas ---
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


// --- Database Connection ---
let conn = null;
async function dbConnect(mongoUri) {
  if (conn == null) {
    conn = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    }).then(() => mongoose);
    await conn;
  }
  return conn;
}

// --- Helper Functions ---
async function getSecrets() {
    const ssm = new aws.SSM();
    const { Parameters } = await ssm.getParameters({
        Names: ["SOCCERS_API_USER", "SOCCERS_API_TOKEN", "MONGO_URI"].map(secretName => process.env[secretName]),
        WithDecryption: true,
    }).promise();

    const secrets = {};
    for (const param of Parameters) {
        // The Name is the full path, so we extract the base name.
        const secretName = param.Name.split('/').pop();
        secrets[secretName] = param.Value;
    }
    return secrets;
}

async function getOrCreateTeam(TeamModel, name) {
    let team = await TeamModel.findOne({ name });
    if (!team) {
        team = await TeamModel.create({ name });
    }
    return team;
}


exports.handler = async (event) => {
  try {
    const secrets = await getSecrets();
    const { SOCCERS_API_USER, SOCCERS_API_TOKEN, MONGO_URI } = secrets;

    if (!SOCCERS_API_USER || !SOCCERS_API_TOKEN || !MONGO_URI) {
        throw new Error("Required secrets (SOCCERS_API_USER, SOCCERS_API_TOKEN, MONGO_URI) not found in SSM Parameter Store.");
    }

    await dbConnect(MONGO_URI);
    console.log("DB connected");

    const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);
    const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

    // 1. Fetch live/upcoming matches from Soccer’sAPI
    const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
      params: {
        user: SOCCERS_API_USER,
        token: SOCCERS_API_TOKEN,
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

        const homeTeam = await getOrCreateTeam(Team, matchData.home.name);
        const awayTeam = await getOrCreateTeam(Team, matchData.away.name);

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

        const homeTeam = await getOrCreateTeam(Team, matchData.team1);
        const awayTeam = await getOrCreateTeam(Team, matchData.team2);

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
