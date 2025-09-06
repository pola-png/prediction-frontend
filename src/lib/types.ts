
import { z } from 'zod';

export interface Team {
  _id: string;
  name: string;
  logoUrl: string;
}

export interface Match {
  _id: string;
  source: 'footballjson' | 'openligadb' | 'soccerdataapi';
  externalId: string;
  leagueCode: string;
  season: string;
  matchDateUtc: string;
  status: 'scheduled' | 'in-progress' | 'finished' | 'postponed' | 'canceled';
  homeTeam: Team;
  awayTeam: Team;
  homeGoals?: number;
  awayGoals?: number;
  tags?: ('2odds' | '5odds' | 'vip' | 'big10')[];
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  prediction?: Prediction;
}

export interface Prediction {
  _id: string;
  matchId: string;
  version: string;
  features: {
    teamFormWeight: number;
    h2hWeight: number;
    homeAdvWeight: number;
    goalsWeight: number;
    injuriesWeight?: number;
  };
  outcomes: {
    oneXTwo: { home: number; draw: number; away: number };
    doubleChance: { homeOrDraw: number; homeOrAway: number; drawOrAway: number };
    over05: number;
    over15: number;
    over25: number;
    bttsYes: number;
    bttsNo: number;
    correctScoreRange: string;
    halfTimeDraw: number;
  };
  confidence: number;
  bucket: '2odds' | '5odds' | 'vip' | 'big10';
  createdAt: string;
  updatedAt: string;
}

export interface History {
    _id: string;
    matchId: Match;
    predictionId: Prediction;
    resolvedAt?: string;
    result: {
        homeGoals?: number;
        awayGoals?: number;
        outcome?: 'home'|'draw'|'away';
        over15?: boolean;
        over25?: boolean;
        bttsYes?: boolean;
        correctScoreBucket?: string;
    };
    correctness: {
        oneXTwo?: boolean;
        over15?: boolean;
        over25?: boolean;
        bttsYes?: boolean;
        correctScoreRange?: boolean;
    };
    createdAt: string;
}

// AI Flow Schemas

// calculate-match-stats.ts
const MatchRecordSchema = z.object({
    date: z.string().describe("The date of the match."),
    homeTeam: z.string().describe("The name of the home team."),
    awayTeam: z.string().describe("The name of the away team."),
    homeGoals: z.number().describe("Goals scored by the home team."),
    awayGoals: z.number().describe("Goals scored by the away team."),
});

export const CalculateMatchStatsInputSchema = z.object({
  teamAName: z.string().describe('The name of the first primary team (Team A).'),
  teamBName: z.string().describe('The name of the second primary team (Team B).'),
  matches: z.array(MatchRecordSchema).describe('A list of recent historical matches involving either team.'),
});
export type CalculateMatchStatsInput = z.infer<typeof CalculateMatchStatsInputSchema>;


export const CalculateMatchStatsOutputSchema = z.object({
  teamAForm: z.string().describe("A summary of Team A's recent form (e.g., WWLDW)."),
  teamBForm: z.string().describe("A summary of Team B's recent form (e.g., DLLWW)."),
  headToHeadStats: z.string().describe('A summary of the head-to-head results between the two teams.'),
  teamAGoals: z.string().describe("The average number of goals Team A has scored in their recent matches."),
  teamBGoals: z.string().describe("The average number of goals Team B has scored in their recent matches."),
});
export type CalculateMatchStatsOutput = z.infer<typeof CalculateMatchStatsOutputSchema>;

// generate-match-predictions.ts
export const GenerateMatchPredictionsInputSchema = z.object({
  teamFormWeight: z.number().describe('Weight for team form in prediction.'),
  h2hWeight: z.number().describe('Weight for head-to-head stats in prediction.'),
  homeAdvWeight: z.number().describe('Weight for home advantage in prediction.'),
  goalsWeight: z.number().describe('Weight for goals scored in prediction.'),
  matchDetails: z.string().describe('Details about the, including teams, date, and league.'),
  teamAForm: z.string().describe('Recent form of team A (last 5-10 matches).'),
  teamBForm: z.string().describe('Recent form of team B (last 5-10 matches).'),
  headToHeadStats: z.string().describe('Head-to-head statistics between the two teams.'),
  teamAGoals: z.string().describe('Average goals scored by team A.'),
  teamBGoals: z.string().describe('Average goals scored by team B.'),
  injuriesWeight: z.number().optional().describe('Weight for injuries in prediction.'),
  teamAInjuries: z.string().optional().describe('Injury information for team A.'),
  teamBInjuries: z.string().optional().describe('Injury information for team B.'),
});
export type GenerateMatchPredictionsInput = z.infer<typeof GenerateMatchPredictionsInputSchema>;

export const GenerateMatchPredictionsOutputSchema = z.object({
  oneXTwo: z.object({
    home: z.number().describe('Probability of home team winning (0-1).'),
    draw: z.number().describe('Probability of a draw (0-1).'),
    away: z.number().describe('Probability of away team winning (0-1).'),
  }),
  doubleChance: z.object({
    homeOrDraw: z.number().describe('Probability of home team winning or a draw (0-1).'),
    homeOrAway: z.number().describe('Probability of home or away team winning (0-1).'),
    drawOrAway: z.number().describe('Probability of a draw or away team winning (0-1).'),
  }),
  over05: z.number().describe('Probability of over 0.5 goals (0-1).'),
  over15: z.number().describe('Probability of over 1.5 goals (0-1).'),
  over25: z.number().describe('Probability of over 2.5 goals (0-1).'),
  bttsYes: z.number().describe('Probability of both teams to score (0-1).'),
  bttsNo: z.number().describe('Probability of at least one team not scoring (0-1).'),
  correctScoreRange: z.string().describe('Most likely correct score range.'),
  halfTimeDraw: z.number().describe('Probability of the match being a draw at half-time (0-1).'),
  confidence: z.number().describe('Confidence level of the prediction (50-100).'),
  bucket: z.enum(['vip', '2odds', '5odds', 'big10']).describe('The prediction bucket (vip, 2odds, 5odds, big10).'),
});
export type GenerateMatchPredictionsOutput = z.infer<typeof GenerateMatchPredictionsOutputSchema>;


// get-prediction-parameters.ts
export const GetPredictionParametersInputSchema = z.object({
  matchDetails: z.string().describe('Details about the match, including teams, date, and league.'),
});
export type GetPredictionParametersInput = z.infer<typeof GetPredictionParametersInputSchema>;

// prediction-params-tool.ts
export const PredictionParametersSchema = z.object({
  teamFormWeight: z.number().describe('Weight for team form in prediction (0-1).'),
  h2hWeight: z.number().describe('Weight for head-to-head stats in prediction (0-1).'),
  homeAdvWeight: z.number().describe('Weight for home advantage in prediction (0-1).'),
  goalsWeight: z.number().describe('Weight for goals scored in prediction (0-1).'),
});
export type PredictionParameters = z.infer<typeof PredictionParametersSchema>;


// summarize-match-insights.ts
export const SummarizeMatchInsightsInputSchema = z.object({
  matchId: z.string().describe('The ID of the match to summarize.'),
  homeTeamName: z.string().describe('The name of the home team.'),
  awayTeamName: z.string().describe('The name of the away team.'),
  prediction: z.object({
    oneXTwo: z.object({
      home: z.number(),
      draw: z.number(),
      away: z.number(),
    }).describe('Probabilities for home win, draw, and away win.'),
    over15: z.number().describe('Probability for over 1.5 goals.'),
    over25: z.number().describe('Probability for over 2.5 goals.'),
    bttsYes: z.number().describe('Probability for both teams to score.'),
    correctScoreRange: z.string().describe('The most likely correct score range.'),
  }).describe('The prediction for the match.'),
  features: z.object({
    teamFormWeight: z.number(),
    h2hWeight: z.number(),
    homeAdvWeight: z.number(),
    goalsWeight: z.number(),
    injuriesWeight: z.number().optional(),
  }).describe('Weights of the features used in the prediction.'),
});
export type SummarizeMatchInsightsInput = z.infer<typeof SummarizeMatchInsightsInputSchema>;

export const SummarizeMatchInsightsOutputSchema = z.object({
  summary: z.string().describe('A summary of the key insights and factors influencing the match prediction.'),
});
export type SummarizeMatchInsightsOutput = z.infer<typeof SummarizeMatchInsightsOutputSchema>;
