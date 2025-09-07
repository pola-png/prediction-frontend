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


// --- Mongoose Schemas ---
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
async function dbConnect() {
  if (conn == null) {
    conn = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    }).then(() => mongoose);
    await conn;
  }
  return conn;
}


exports.handler = async (event) => {
  try {
    const { SOCCERS_API_USER, SOCCERS_API_TOKEN, MONGO_URI } = process.env;

     if (!SOCCERS_API_USER || !SOCCERS_API_TOKEN || !MONGO_URI) {
        throw new Error("Required environment variables (SOCCERS_API_USER, SOCCERS_API_TOKEN, MONGO_URI) are not set.");
    }

    await dbConnect();
    console.log("DB Connected");

    const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

    const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
      params: {
        user: SOCCERS_API_USER,
        token: SOCCERS_API_TOKEN,
        t: "results",
      },
    });

    const results = soccerRes.data.data || [];
    let updatedCount = 0;
    console.log(`Fetched ${results.length} results from SoccersAPI.`);

    for (const matchResult of results) {
        if (!matchResult.id || !matchResult.score || matchResult.status !== 'finished') continue;

        const [homeGoals, awayGoals] = matchResult.score.ft_score.split('-').map(Number);

        const updated = await Match.findOneAndUpdate(
            { externalId: String(matchResult.id) },
            {
                $set: {
                    status: 'finished',
                    homeGoals,
                    awayGoals,
                    updatedAt: new Date(),
                }
            },
            { new: true } // returns the updated document
        );
        
        if(updated) {
            updatedCount++;
        }
    }
    
    console.log(`Updated ${updatedCount} matches with results.`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, updatedCount }),
    };
  } catch (error) {
    console.error("Fetching results failed:", error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    return { 
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
