/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["SOCCERS_API_USER","SOCCERS_API_TOKEN"].map(secretName => process.env[secretName]),
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

const axios = require("axios");
const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const MATCHES_TABLE = process.env.MATCHES_TABLE;
const SOCCERS_API_USER = process.env.SOCCERS_API_USER;
const SOCCERS_API_TOKEN = process.env.SOCCERS_API_TOKEN;


/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    try {
        // 1. Fetch current matches from Soccer’sAPI
        const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
          params: {
            user: SOCCERS_API_USER,
            token: SOCCERS_API_TOKEN,
            t: "upcoming",
          },
        });

        const matches = soccerRes.data.data || [];
        console.log(`Fetched ${matches.length} upcoming matches from SoccersAPI.`);

        // 2. Save matches to DynamoDB
        for (const match of matches) {
            if (!match.id || !match.home || !match.away) continue;
            
            const Item = {
                id: String(match.id),
                home: match.home.name,
                away: match.away.name,
                start: match.date_time,
                status: match.status,
                league: match.league.name,
                league_id: String(match.league_id),
                season_id: String(match.season_id),
                home_logo: match.home.logo,
                away_logo: match.away.logo,
                createdAt: new Date().toISOString(),
            };
            
            await dynamoDB.put({
                TableName: MATCHES_TABLE,
                Item
            }).promise();
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, count: matches.length }),
        };
    } catch (error) {
        console.error("Soccer’sAPI failed:", error.message);
        if (error.response) {
            console.error("API Response:", error.response.data);
        }

        // 3. Fallback: load football.json history from GitHub
        try {
            console.log('Executing fallback to historical data from football.json');
            const fallbackRes = await axios.get(
                "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json"
            );
            const history = fallbackRes.data.matches || [];
            console.log(`Fetched ${history.length} historical matches.`);

            for (const match of history) {
                if (!match.team1 || !match.team2 || !match.date) continue;
                
                const Item = {
                    id: `${match.date}-${match.team1.toLowerCase().replace(' ', '-')}-${match.team2.toLowerCase().replace(' ', '-')}`,
                    home: match.team1,
                    away: match.team2,
                    start: match.date,
                    status: "finished",
                    league: "Premier League 23/24 History",
                    homeGoals: match.score.ft[0],
                    awayGoals: match.score.ft[1],
                    createdAt: new Date().toISOString(),
                };
                
                await dynamoDB.put({
                    TableName: MATCHES_TABLE,
                    Item
                }).promise();
            }

            return { 
                statusCode: 200,
                body: JSON.stringify({ success: true, fallback: true, count: history.length })
            };
        } catch (fbError) {
            console.error("Fallback GitHub failed:", fbError.message);
            return { 
                statusCode: 500,
                body: JSON.stringify({ success: false, error: fbError.message })
            };
        }
    }
};
