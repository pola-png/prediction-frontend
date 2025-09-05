
export interface Team {
  _id: string;
  name: string;
  logoUrl: string;
}

export interface Match {
  _id: string;
  source: 'footballjson' | 'openligadb';
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
