import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

// This is a placeholder for a database model.
// In a real application, you would import your Mongoose model here.
const MockMatch = {
  findOne: async (query: any) => {
    console.log('Searching for match with query:', query);
    // Simulate finding a match occasionally to test update logic
    return Math.random() > 0.8 ? { some: 'data', save: () => console.log('Saving mock data') } : null;
  },
  create: async (data: any) => {
    console.log('Creating match with data:', data);
    return { ...data, save: () => console.log('Saving new mock data') };
  }
};


const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const SUPER_SECRET_TOKEN = process.env.CRON_SECRET;

const footballDataApi = axios.create({
  baseURL: 'https://api.football-data.org/v4/',
  headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
});

const openLigaDBApi = axios.create({
  baseURL: 'https://api.openligadb.de',
});

function getMatchHash(match: any) {
  const hashString = `${match.utcDate}-${match.homeTeam.name}-${match.awayTeam.name}`;
  return crypto.createHash('md5').update(hashString).digest('hex');
}

async function seedMatches() {
  let count = 0;
  try {
    const response = await footballDataApi.get('matches');
    const matches = response.data.matches;

    for (const matchData of matches) {
      const matchHash = getMatchHash(matchData);
      const existingMatch = await MockMatch.findOne({ matchHash });

      if (!existingMatch) {
        await MockMatch.create({
          ...matchData,
          homeTeam: { name: matchData.homeTeam.name, crest: matchData.homeTeam.crest },
          awayTeam: { name: matchData.awayTeam.name, crest: matchData.awayTeam.crest },
          score: {
            winner: matchData.score.winner,
            fullTime: {
              home: matchData.score.fullTime.home,
              away: matchData.score.fullTime.away,
            },
          },
          matchHash,
          source: 'football-data.org',
        });
        count++;
      }
    }
    return { success: true, message: `Successfully seeded ${count} new matches.` };
  } catch (error: any) {
    console.error('Error seeding matches:', error.message);
    return { success: false, message: 'Failed to seed matches.' };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (token !== SUPER_SECRET_TOKEN) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const result = await seedMatches();

  if (result.success) {
    return NextResponse.json({ message: result.message });
  } else {
    return NextResponse.json({ message: result.message }, { status: 500 });
  }
}
