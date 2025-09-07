
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { fetchFromSoccersApi } from '@/services/soccersapi-service';
import MatchModel from '@/models/Match';
import TeamModel from '@/models/Team';
import type { Match, Team } from '@/lib/types';
import fetch from 'node-fetch';


interface FootballJsonMatch {
    date: string; 
    team1: string;
    team2: string;
    score: {
        ft: [number, number];
    };
    round: string;
}

interface FootballJsonLeague {
    name: string;
    matches: FootballJsonMatch[];
}

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/openfootball/football.json/master';
const leaguesToFetch = [
    '2023-24/en.1.json', // English Premier League
    '2023-24/es.1.json', // Spanish La Liga
    '2023-24/de.1.json', // German Bundesliga
    '2023-24/it.1.json', // Italian Serie A
    '2023-24/fr.1.json', // French Ligue 1
];

// Helper function to create a slug from a team name
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')       // Replace spaces with -
        .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
        .replace(/\-\-+/g, '-')     // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
}

const teamCache = new Map<string, any>();
async function getTeam(teamName: string): Promise<any> {
    const slug = slugify(teamName);
    if (teamCache.has(slug)) {
        return teamCache.get(slug);
    }
    let team = await TeamModel.findOne({ slug: slug });
    if (!team) {
        team = new TeamModel({
            name: teamName,
            slug: slug,
            logoUrl: `https://picsum.photos/seed/${slug}/40/40`,
        });
        await team.save();
        console.log(`Created team: ${teamName}`);
    }
    teamCache.set(slug, team);
    return team;
}

export async function updateOrCreateMatch(matchData: Partial<Match>) {
    const homeTeam = await getTeam(matchData.homeTeam!.name);
    const awayTeam = await getTeam(matchData.awayTeam!.name);

    const filter = { source: matchData.source, externalId: matchData.externalId };
    const update = {
        ...matchData,
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        status: matchData.status || 'finished',
        lastUpdatedAt: new Date(),
    };

    await MatchModel.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
}


async function fetchHistoricalData() {
    let count = 0;
    for(const leagueFile of leaguesToFetch) {
        try {
            const response = await fetch(`${GITHUB_BASE_URL}/${leagueFile}`);
            if (response.ok) {
                const data: FootballJsonLeague = await response.json() as FootballJsonLeague;
                const leagueName = data.name;

                 for (const match of data.matches) {
                    if (!match.team1 || !match.team2 || !match.score) continue;

                    const matchData: Partial<any> = {
                        source: 'footballjson',
                        externalId: `${match.date}-${slugify(match.team1)}-${slugify(match.team2)}`, 
                        leagueCode: leagueName,
                        season: '2023/2024',
                        matchDateUtc: new Date(match.date).toISOString(),
                        status: 'finished',
                        homeTeam: { name: match.team1 },
                        awayTeam: { name: match.team2 },
                        homeGoals: match.score.ft[0],
                        awayGoals: match.score.ft[1],
                    };
                    await updateOrCreateMatch(matchData);
                    count++;
                }
            } else {
                console.warn(`API: Failed to fetch ${leagueFile}: ${response.statusText}`);
            }
        } catch(error) {
            console.error(`API: Error fetching ${leagueFile}:`, error);
        }
    }
    return count;
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    // 1. Fetch Live Data
    console.log('API: Starting live data fetch from SoccersAPI...');
    const matchesFromApi = await fetchFromSoccersApi();
    let liveProcessedCount = 0;
    if (matchesFromApi.length > 0) {
        for (const matchData of matchesFromApi) {
            await updateOrCreateMatch(matchData);
            liveProcessedCount++;
        }
    }
    console.log(`API: Processed ${liveProcessedCount} live matches from SoccersAPI.`);

    // 2. Fetch Historical Data
    console.log('API: Starting historical data fetch from football.json...');
    const historicalProcessedCount = await fetchHistoricalData();
    console.log(`API: Processed ${historicalProcessedCount} historical matches from football.json.`);


    const message = `Data fetch complete. Processed ${liveProcessedCount} live matches and ${historicalProcessedCount} historical matches.`;
    console.log(`API: ${message}`);
    
    return NextResponse.json({ message, liveProcessedCount, historicalProcessedCount });

  } catch (error: any) {
    console.error('Failed to fetch data via API:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
