
import { z } from 'zod';

export interface Team {
  _id: string; 
  name: string;
  logoUrl?: string;
}

export interface Match {
  _id: string; 
  source?: 'footballjson' | 'soccersapi';
  externalId?: string;
  leagueCode: string;
  season?: string;
  matchDateUtc: string;
  status: 'scheduled' | 'in-progress' | 'finished' | 'postponed' | 'canceled' | string;
  homeTeam: Team;
  awayTeam: Team;
  homeGoals?: number;
  awayGoals?: number;
  tags?: ('2odds' | '5odds' | 'vip' | 'big10')[];
  lastUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  prediction?: Prediction;
}

export interface Prediction {
  _id: string;
  matchId: string;
  version?: string;
  features?: {
    teamFormWeight: number;
    h2hWeight: number;
    homeAdvWeight: number;
    goalsWeight: number;
    injuriesWeight?: number;
  };
  outcomes: {
    oneXTwo: { home: number; draw: number; away: number };
    doubleChance?: { homeOrDraw: number; homeOrAway: number; drawOrAway: number };
    over05?: number;
    over15: number;
    over25: number;
    bttsYes: number;
    bttsNo?: number;
  };
  confidence: number;
  bucket: '2odds' | '5odds' | 'vip' | 'big10';
  createdAt?: string;
  updatedAt?: string;
}

// Zod Schemas for AI Flows
export const PredictionParametersSchema = z.object({
  teamFormWeight: z.number().min(0).max(1),
  h2hWeight: z.number().min(0).max(1),
  homeAdvWeight: z.number().min(0).max(1),
  goalsWeight: z.number().min(0).max(1),
});
export type PredictionParameters = z.infer<typeof PredictionParametersSchema>;

export const GetPredictionParametersInputSchema = z.object({
  matchDetails: z.string(),
});
export type GetPredictionParametersInput = z.infer<typeof GetPredictionParametersInputSchema>;


export const GenerateMatchPredictionsOutputSchema = z.object({
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
export type GenerateMatchPredictionsOutput = z.infer<typeof GenerateMatchPredictionsOutputSchema>;

export const GenerateMatchPredictionsInputSchema = z.object({
  matchDetails: z.string(),
  teamAForm: z.string(),
  teamBForm: z.string(),
  headToHeadStats: z.string(),
  teamAGoals: z.string(),
  teamBGoals: z.string(),
  teamFormWeight: z.number(),
  h2hWeight: z.number(),
  homeAdvWeight: z.number(),
  goalsWeight: z.number(),
  teamAInjuries: z.string().optional(),
  teamBInjuries: z.string().optional(),
  injuriesWeight: z.number().optional(),
});
export type GenerateMatchPredictionsInput = z.infer<typeof GenerateMatchPredictionsInputSchema>;


export const SummarizeMatchInsightsInputSchema = z.object({
  matchId: z.string(),
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  prediction: z.object({
    outcomes: z.object({
        oneXTwo: z.object({ home: z.number(), draw: z.number(), away: z.number(), }),
        over15: z.number(),
        over25: z.number(),
        bttsYes: z.number(),
    }),
  }),
  features: z.object({
    teamFormWeight: z.number(),
    h2hWeight: z.number(),
    homeAdvWeight: z.number(),
    goalsWeight: z.number(),
    injuriesWeight: z.number().optional(),
  }),
});
export type SummarizeMatchInsightsInput = z.infer<typeof SummarizeMatchInsightsInputSchema>;

export const SummarizeMatchInsightsOutputSchema = z.object({
  summary: z.string(),
});
export type SummarizeMatchInsightsOutput = z.infer<typeof SummarizeMatchInsightsOutputSchema>;
