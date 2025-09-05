
// This file is in JS because it's used by a node script.
const upcomingMatches = [
  {
    source: 'footballjson',
    externalId: '1',
    leagueCode: 'PL',
    season: '2024/2025',
    matchDateUtc: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    status: 'scheduled',
    homeTeam: {
      name: 'Manchester United',
      logoUrl: 'https://picsum.photos/seed/manutd/40/40',
    },
    awayTeam: {
      name: 'Arsenal',
      logoUrl: 'https://picsum.photos/seed/arsenal/40/40',
    },
    tags: ['vip', 'big10'],
    lastUpdatedAt: new Date(),
    prediction: {
      version: 'v1.0',
      features: { teamFormWeight: 0.4, h2hWeight: 0.2, homeAdvWeight: 0.2, goalsWeight: 0.2 },
      outcomes: {
        oneXTwo: { home: 0.4, draw: 0.3, away: 0.3 },
        doubleChance: { homeOrDraw: 0.7, homeOrAway: 0.7, drawOrAway: 0.6 },
        over05: 0.95,
        over15: 0.8,
        over25: 0.6,
        bttsYes: 0.7,
        bttsNo: 0.3,
        correctScoreRange: '1-1/2-1',
        halfTimeDraw: 0.45,
      },
      confidence: 88,
      bucket: 'vip',
    },
  },
  {
    source: 'openligadb',
    externalId: '2',
    leagueCode: 'BL1',
    season: '2024/2025',
    matchDateUtc: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    status: 'scheduled',
    homeTeam: {
      name: 'Bayern Munich',
      logoUrl: 'https://picsum.photos/seed/bayern/40/40',
    },
    awayTeam: {
      name: 'Borussia Dortmund',
      logoUrl: 'https://picsum.photos/seed/dortmund/40/40',
    },
    tags: ['2odds', 'big10'],
    lastUpdatedAt: new Date(),
    prediction: {
      version: 'v1.0',
      features: { teamFormWeight: 0.4, h2hWeight: 0.2, homeAdvWeight: 0.2, goalsWeight: 0.2 },
      outcomes: {
        oneXTwo: { home: 0.6, draw: 0.2, away: 0.2 },
        doubleChance: { homeOrDraw: 0.8, homeOrAway: 0.8, drawOrAway: 0.4 },
        over05: 0.98,
        over15: 0.9,
        over25: 0.75,
        bttsYes: 0.65,
        bttsNo: 0.35,
        correctScoreRange: '2-0/3-1',
        halfTimeDraw: 0.3,
      },
      confidence: 92,
      bucket: '2odds',
    },
  },
  {
    source: 'footballjson',
    externalId: '3',
    leagueCode: 'LIGA',
    season: '2024/2025',
    matchDateUtc: new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    status: 'scheduled',
    homeTeam: {
      name: 'Real Madrid',
      logoUrl: 'https://picsum.photos/seed/realmadrid/40/40',
    },
    awayTeam: {
      name: 'Barcelona',
      logoUrl: 'https://picsum.photos/seed/barcelona/40/40',
    },
    tags: ['5odds'],
    lastUpdatedAt: new Date(),
    prediction: {
      version: 'v1.0',
      features: { teamFormWeight: 0.4, h2hWeight: 0.2, homeAdvWeight: 0.2, goalsWeight: 0.2 },
      outcomes: {
        oneXTwo: { home: 0.45, draw: 0.25, away: 0.3 },
        doubleChance: { homeOrDraw: 0.7, homeOrAway: 0.75, drawOrAway: 0.55 },
        over05: 0.96,
        over15: 0.85,
        over25: 0.65,
        bttsYes: 0.8,
        bttsNo: 0.2,
        correctScoreRange: '2-1/2-2',
        halfTimeDraw: 0.4,
      },
      confidence: 85,
      bucket: '5odds',
    },
  },
    {
    source: 'footballjson',
    externalId: '4',
    leagueCode: 'SERA',
    season: '2024/2025',
    matchDateUtc: new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    status: 'scheduled',
    homeTeam: {
      name: 'Juventus',
      logoUrl: 'https://picsum.photos/seed/juventus/40/40',
    },
    awayTeam: {
      name: 'Inter Milan',
      logoUrl: 'https://picsum.photos/seed/inter/40/40',
    },
    tags: ['vip'],
    lastUpdatedAt: new Date(),
    prediction: {
      version: 'v1.0',
      features: { teamFormWeight: 0.5, h2hWeight: 0.1, homeAdvWeight: 0.2, goalsWeight: 0.2 },
      outcomes: {
        oneXTwo: { home: 0.3, draw: 0.4, away: 0.3 },
        doubleChance: { homeOrDraw: 0.7, homeOrAway: 0.6, drawOrAway: 0.7 },
        over05: 0.9,
        over15: 0.7,
        over25: 0.4,
        bttsYes: 0.5,
        bttsNo: 0.5,
        correctScoreRange: '1-1/0-0',
        halfTimeDraw: 0.6,
      },
      confidence: 80,
      bucket: 'vip',
    },
  },
];

const finishedMatches = [
    {
        source: 'footballjson',
        externalId: '5',
        leagueCode: 'PL',
        season: '2023/2024',
        matchDateUtc: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'finished',
        homeTeam: { name: 'Chelsea', logoUrl: 'https://picsum.photos/seed/chelsea/40/40' },
        awayTeam: { name: 'Tottenham Hotspur', logoUrl: 'https://picsum.photos/seed/tottenham/40/40' },
        homeGoals: 2,
        awayGoals: 0,
        lastUpdatedAt: new Date(),
        prediction: {
            version: 'v1.0',
            features: { teamFormWeight: 0.4, h2hWeight: 0.3, homeAdvWeight: 0.2, goalsWeight: 0.1 },
            outcomes: {
              oneXTwo: { home: 0.5, draw: 0.3, away: 0.2 },
              doubleChance: { homeOrDraw: 0.8, homeOrAway: 0.7, drawOrAway: 0.5 },
              over05: 0.95,
              over15: 0.8,
              over25: 0.5,
              bttsYes: 0.4,
              bttsNo: 0.6,
              correctScoreRange: '2-0/1-0',
              halfTimeDraw: 0.4,
            },
            confidence: 85,
            bucket: 'vip',
        },
        history: {
            resolvedAt: new Date(),
            result: { homeGoals: 2, awayGoals: 0, outcome: 'home', over15: true, over25: false, bttsYes: false },
            correctness: { oneXTwo: true, over15: true, over25: true, bttsYes: true, correctScoreRange: true },
        }
    },
    {
        source: 'openligadb',
        externalId: '6',
        leagueCode: 'BL1',
        season: '2023/2024',
        matchDateUtc: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'finished',
        homeTeam: { name: 'RB Leipzig', logoUrl: 'https://picsum.photos/seed/leipzig/40/40' },
        awayTeam: { name: 'Eintracht Frankfurt', logoUrl: 'https://picsum.photos/seed/frankfurt/40/40' },
        homeGoals: 2,
        awayGoals: 2,
        lastUpdatedAt: new Date(),
        prediction: {
            version: 'v1.0',
            features: { teamFormWeight: 0.4, h2hWeight: 0.2, homeAdvWeight: 0.2, goalsWeight: 0.2 },
            outcomes: {
              oneXTwo: { home: 0.4, draw: 0.35, away: 0.25 },
              doubleChance: { homeOrDraw: 0.75, homeOrAway: 0.65, drawOrAway: 0.6 },
              over05: 0.98,
              over15: 0.9,
              over25: 0.7,
              bttsYes: 0.75,
              bttsNo: 0.25,
              correctScoreRange: '2-1/1-1',
              halfTimeDraw: 0.35,
            },
            confidence: 90,
            bucket: 'big10',
        },
        history: {
            resolvedAt: new Date(),
            result: { homeGoals: 2, awayGoals: 2, outcome: 'draw', over15: true, over25: true, bttsYes: true },
            correctness: { oneXTwo: true, over15: true, over25: true, bttsYes: true, correctScoreRange: false },
        }
    }
];


module.exports = { upcomingMatches, finishedMatches };
