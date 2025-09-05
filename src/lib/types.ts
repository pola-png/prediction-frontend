export interface Team {
  id?: string;
  name: string;
  logoUrl: string;
}

export interface Match {
  _id: string;
  source: 'footballjson' | 'openligadb';
  externalId: string;
  leagueCode: string;
  season: string;
  matchDateUtc: Date;
  status: 'scheduled' | 'in-progress' | 'finished' | 'postponed' | 'canceled';
  homeTeam: Team;
  awayTeam: Team;
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
