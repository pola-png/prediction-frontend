
export interface Team {
  _id: string; // Will now map to DynamoDB ID
  name: string;
  logoUrl: string;
}

export interface Match {
  _id: string; // Will now map to DynamoDB ID
  source?: 'footballjson' | 'openligadb' | 'soccerdataapi';
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
  _id: string; // Will now map to DynamoDB ID
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
