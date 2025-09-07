/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["GEMINI_API_KEY"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

const AWS = require("aws-sdk");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function callGenerativeAI(prompt) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // The text is expected to be a JSON string, sometimes wrapped in markdown
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
}


/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    try {
        // 1. Scan for upcoming matches that need a prediction
        const scanResult = await dynamoDB.scan({
            TableName: MATCHES_TABLE,
            FilterExpression: "attribute_not_exists(predictionId)"
        }).promise();
        
        const upcomingMatches = scanResult.Items || [];
        console.log(`Found ${upcomingMatches.length} matches needing predictions.`);
        
        // 2. Fetch historical data for context
        const historyRes = await axios.get(
            "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json"
        );
        const historicalMatches = historyRes.data.matches || [];

        // 3. Generate and save predictions for each match
        for(const match of upcomingMatches) {
            const h2hMatches = historicalMatches.filter(
                h => (h.team1 === match.home && h.team2 === match.away) || (h.team1 === match.away && h.team2 === match.home)
            );
            
            const prompt = `
You are an expert sports analyst. Generate a football match prediction in JSON format.

Match Details: ${match.home} vs ${match.away}
League: ${match.league}
Date: ${match.start}

Historical Head-to-Head:
${h2hMatches.map(m => `- ${m.date}: ${m.team1} ${m.score.ft[0]} - ${m.score.ft[1]} ${m.team2}`).join('\n') || 'No direct H2H data available.'}

Based on this, provide probabilities (0-1) for:
- 1X2 (home, draw, away)
- Over/Under 2.5 goals
- Both Teams to Score (BTTS) Yes/No
- A confidence score (50-100)
- A prediction bucket ('vip', '2odds', '5odds', 'big10')

Example JSON output:
{
  "oneXTwo": {"home": 0.45, "draw": 0.3, "away": 0.25},
  "over25": 0.55,
  "bttsYes": 0.6,
  "confidence": 85,
  "bucket": "vip"
}
`;
            
            try {
                const predictionResult = await callGenerativeAI(prompt);
                
                const predictionId = `${match.id}-pred-v1`;
                
                // Save prediction to Predictions table
                await dynamoDB.put({
                    TableName: PREDICTIONS_TABLE,
                    Item: {
                        id: predictionId,
                        matchId: match.id,
                        ...predictionResult,
                        createdAt: new Date().toISOString()
                    }
                }).promise();
                
                // Update match with predictionId
                await dynamoDB.update({
                    TableName: MATCHES_TABLE,
                    Key: { id: match.id },
                    UpdateExpression: "set predictionId = :p",
                    ExpressionAttributeValues: {
                        ":p": predictionId
                    }
                }).promise();
                
                console.log(`Successfully generated prediction for match ${match.id}`);

            } catch (aiError) {
                console.error(`Failed to generate prediction for match ${match.id}:`, aiError);
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, processed: upcomingMatches.length }),
        };

    } catch (error) {
        console.error("Prediction generation failed:", error.message);
        return { 
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
