
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { z } = require("zod");

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY environment variable not set. AI features will be disabled.');
}
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const GenerateMatchPredictionsOutputSchema = z.object({
  oneXTwo: z.object({ home: z.number(), draw: z.number(), away: z.number() }),
  doubleChance: z.object({ homeOrDraw: z.number(), homeOrAway: z.number(), drawOrAway: z.number() }),
  over05: z.number(),
  over15: z.number(),
  over25: z.number(),
  bttsYes: z.number(),
  bttsNo: z.number(),
  confidence: z.number().min(0).max(100),
  bucket: z.enum(['vip', '2odds', '5odds', 'big10']),
});

async function callGenerativeAI(prompt, outputSchema) {
    if (!genAI) throw new Error("Generative AI is not initialized. Check GEMINI_API_KEY.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview" });
    
    // Adding retry logic
    for (let i = 0; i < 3; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            if (!text) {
                throw new Error("AI returned empty response.");
            }

            const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(jsonString);
            return outputSchema.parse(parsed); // Validate with Zod
        } catch(error) {
            console.error(`AI call attempt ${i+1} failed.`, error.message);
            if (i === 2) throw error; // Rethrow after last attempt
            await new Promise(res => setTimeout(res, 1000 * (i + 1))); // wait before retrying
        }
    }
}

async function getPredictionFromAI(match, historicalMatches) {
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
- A confidence score (0-100)
- A prediction bucket ('vip', '2odds', '5odds', 'big10')

Your response MUST be a valid JSON object that conforms to the Zod schema provided.
Do not wrap the JSON in markdown backticks.
`;
    return await callGenerativeAI(prompt, GenerateMatchPredictionsOutputSchema);
}


async function getSummaryFromAI(match) {
    if (!genAI) throw new Error("Generative AI is not initialized. Check GEMINI_API_KEY.");
    const prompt = `Provide a concise summary of the key insights and factors influencing the prediction for the match between ${match.homeTeam.name} and ${match.awayTeam.name}.

    Focus on the most significant factors that contribute to the predicted outcomes, such as team form, head-to-head statistics, home advantage, and goal-scoring trends. Explain the rationale behind the prediction in a way that is easy to understand.
    `;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}


module.exports = { getPredictionFromAI, getSummaryFromAI };
