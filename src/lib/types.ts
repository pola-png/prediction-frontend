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
  matchDateUtc: string; // Changed to string for serialization
  status: 'scheduled' | 'in-progress' | 'finished' | 'postponed' | 'canceled';
  homeTeam: Team;
  awayTeam: Team;
  homeGoals?: number;
  awayGoals?: number;
  tags?: ('2odds' | '5odds' | 'vip' | 'big10')[];
  lastUpdatedAt: string; // Changed to string for serialization
  createdAt: string; // Changed to string for serialization
  updatedAt: string; // Changed to string for serialization
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
  createdAt: string; // Changed to string for serialization
  updatedAt: string; // Changed to string for serialization
}
