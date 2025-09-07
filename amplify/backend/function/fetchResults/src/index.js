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

const RESULTS_TABLE = process.env.RESULTS_TABLE;
const SOCCERS_API_USER = process.env.SOCCERS_API_USER;
const SOCCERS_API_TOKEN = process.env.SOCCERS_API_TOKEN;

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    try {
        const soccerRes = await axios.get("https://api.soccersapi.com/v2.2/fixtures/", {
          params: {
            user: SOCCERS_API_USER,
            token: SOCCERS_API_TOKEN,
            t: "results", // Fetch recent results
          },
        });

        const results = soccerRes.data.data || [];
        console.log(`Fetched ${results.length} results from SoccersAPI.`);

        for (const match of results) {
            if (!match.id || !match.score) continue;
            
            const [homeGoals, awayGoals] = match.score.ft_score.split('-').map(Number);
            
            const Item = {
                id: String(match.id),
                home: match.home.name,
                away: match.away.name,
                start: match.date_time,
                status: match.status,
                league: match.league.name,
                homeGoals,
                awayGoals,
                resolvedAt: new Date().toISOString(),
            };
            
            await dynamoDB.put({
                TableName: RESULTS_TABLE,
                Item,
            }).promise();
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, count: results.length }),
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
