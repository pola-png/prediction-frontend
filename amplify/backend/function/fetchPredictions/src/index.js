/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["GEMINI_API_KEY", "MONGO_URI"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const { z } = require("zod");

const { Schema } = mongoose;

// --- Config ---
const MONGO_URI = process.env.MONGO_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview" });

// --- Mongoose Schemas ---
const TeamSchema = new Schema({ name: String, logoUrl: String });
const PredictionSchema = new Schema({
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    version: String,
    features: {
        teamFormWeight: Number,
        h2hWeight: Number,
        homeAdvWeight: Number,
        goalsWeight: Number,
    },
    outcomes: {
        oneXTwo: { home: Number, draw: Number, away: Number },
        doubleChance: { homeOrDraw: Number, homeOrAway: Number, drawOrAway: Number },
        over05: Number,
        over15: Number,
        over25: Number,
        bttsYes: Number,
        bttsNo: Number,
    },
    confidence: Number,
    bucket: String,
    createdAt: { type: Date, default: Date.now },
});
const MatchSchema = new Schema({
    homeTeam: { type: Schema.Types.ObjectId, ref: "Team" },
    awayTeam: { type: Schema.Types.ObjectId, ref: "Team" },
    status: String,
    matchDateUtc: Date,
    leagueCode: String,
    homeGoals: Number,
    awayGoals: Number,
    prediction: { type: Schema.Types.ObjectId, ref: "Prediction" }
});

const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);
const Prediction = mongoose.models.Prediction || mongoose.model("Prediction", PredictionSchema);
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

// --- Zod Schemas for AI Output ---
const GenerateMatchPredictionsOutputSchema = z.object({
  oneXTwo: z.object({ home: z.number(), draw: z.number(), away: z.number() }),
  doubleChance: z.object({ homeOrDraw: z.number(), homeOrAway: z.number(), drawOrAway: z.number() }),
  over05: z.number(),
  over15: z.number(),
  over25: z.number(),
  bttsYes: z.number(),
  bttsNo: z.number(),
  confidence: z.number().min(50).max(100),
  bucket: z.enum(['vip', '2odds', '5odds', 'big10']),
});

// --- Database Connection ---
let conn = null;
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


async function callGenerativeAI(prompt) {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonString);
    return GenerateMatchPredictionsOutputSchema.parse(parsed); // Validate with Zod
}

exports.handler = async (event) => {
  await dbConnect();
  console.log("DB connected");

  // 1. Find matches needing predictions
  const upcomingMatches = await Match.find({
    status: 'scheduled',
    matchDateUtc: { $gte: new Date() },
    prediction: { $exists: false }
  }).populate('homeTeam').populate('awayTeam').lean();

  if (upcomingMatches.length === 0) {
    console.log("No matches need predictions.");
    return { statusCode: 200, body: JSON.stringify({ success: true, processed: 0 })};
  }
  console.log(`Found ${upcomingMatches.length} matches to predict.`);

  // 2. Get historical context
  const historicalMatches = await Match.find({
    status: 'finished'
  }).populate('homeTeam').populate('awayTeam').lean();
  
  // 3. Generate and save predictions
  let successCount = 0;
  for (const match of upcomingMatches) {
    try {
        const h2hMatches = historicalMatches.filter(
            h => (h.homeTeam.name === match.homeTeam.name && h.awayTeam.name === match.awayTeam.name) || 
                 (h.homeTeam.name === match.awayTeam.name && h.awayTeam.name === match.homeTeam.name)
        );

        const prompt = `
You are an expert sports analyst. Generate a football match prediction in JSON format.

Match Details: ${match.homeTeam.name} vs ${match.awayTeam.name}
League: ${match.leagueCode}
Date: ${match.matchDateUtc}

Historical Head-to-Head:
${h2hMatches.map(m => `- ${new Date(m.matchDateUtc).toLocaleDateString()}: ${m.homeTeam.name} ${m.homeGoals} - ${m.awayGoals} ${m.awayTeam.name}`).join('\n') || 'No direct H2H data available.'}

Based on this, provide probabilities (0-1) for:
- 1X2 (home, draw, away)
- Double Chance (home/draw, home/away, draw/away)
- Over/Under 0.5, 1.5, 2.5 goals
- Both Teams to Score (BTTS) Yes/No
- A confidence score (50-100)
- A prediction bucket ('vip', '2odds', '5odds', 'big10')

Your response MUST be a valid JSON object.
`;
        const predictionResult = await callGenerativeAI(prompt);
        
        const predictionDoc = new Prediction({
            matchId: match._id,
            outcomes: predictionResult,
            confidence: predictionResult.confidence,
            bucket: predictionResult.bucket,
            version: '1.0-lambda'
        });
        await predictionDoc.save();

        await Match.updateOne({ _id: match._id }, { $set: { prediction: predictionDoc._id } });
        
        console.log(`Successfully generated prediction for match ${match._id}`);
        successCount++;

    } catch (error) {
        console.error(`Failed to generate prediction for match ${match._id}:`, error.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, processed: upcomingMatches.length, successCount }),
  };
};
