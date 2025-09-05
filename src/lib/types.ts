export interface Team {
  _id: string;
  source: 'footballjson' | 'openligadb' | 'manual';
  externalId?: string;
  name: string;
  shortName?: string;
  country?: string;
  leagueCode?: string;
  season?: string;
  logoUrl?: string;
  stats?: {
    formLast5?: { date: Date; opp: string; gf: number; ga: number; result: 'W' | 'D' | 'L' }[];
    avgGF?: number;
    avgGA?: number;
    homeStrength?: number;
    awayStrength?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Match {
  _id: string;
  source: 'footballjson' | 'openligadb';
  externalId: string;
  leagueCode: string;
  season: string;
  matchDateUtc: Date;
  status: 'scheduled' | 'in-progress' | 'finished' | 'postponed' | 'canceled';
  homeTeam: { id?: string; name: string, logoUrl: string };
  awayTeam: { id?: string; name: string, logoUrl: string };
  homeGoals?: number;
  awayGoals?: number;
  tags?: ('2odds' | '5odds' | 'vip' | 'big10')[];
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
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
    over15: number;
    over25: number;
    bttsYes: number;
    correctScoreRange: string;
  };
  confidence: number;
  bucket: '2odds' | '5odds' | 'vip' | 'big10';
  createdAt: Date;
  updatedAt: Date;
}

export interface History {
  _id: string;
  matchId: string;
  predictionId: string;
  resolvedAt?: Date;
  result: {
    homeGoals?: number;
    awayGoals?: number;
    outcome?: 'home' | 'draw' | 'away';
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
  createdAt: Date;
}
