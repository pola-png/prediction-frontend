
import 'dotenv/config';
import type { Match, Team } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';

// --- Soccerdataapi.com Integration ---
const SOCCERDATA_BASE_URL = 'https://api.soccerdataapi.com';
const SOCCERDATA_API_KEY = process.env.SOCCERDATA_API_KEY;

interface SoccerDataMatch {
    id: number;
    date: string; // "26/08/2023"
    time: string; // "00:30"
    teams: {
        home: { id: number; name: string };
        away: { id: number; name: string };
    };
    status: string; // "finished", "not_started", "inplay"
    league_id: number;
    league_name: string;
}

interface SoccerDataLeague {
    league_id: number;
    league_name: string;
    matches: SoccerDataMatch[];
}

const teamCache = new Map<string, any>();

async function getTeam(teamName: string, logoUrl: string): Promise<any> {
    if (teamCache.has(teamName)) {
        return teamCache.get(teamName);
    }
    let team = await TeamModel.findOne({ name: teamName });
    if (!team) {
        team = new TeamModel({
            name: teamName,
            logoUrl: logoUrl || `https://picsum.photos/seed/${teamName.replace(/\s+/g, '')}/40/40`,
        });
        await team.save();
        console.log(`Created team: ${teamName}`);
    }
    teamCache.set(teamName, team);
    return team;
}

function parseMatchDate(dateStr: string, timeStr: string): Date {
    // dateStr: "26/08/2023", timeStr: "00:30"
    const [day, month, year] = dateStr.split('/');
    const [hours, minutes] = timeStr.split(':');
    // Note: The month is 0-indexed in JavaScript Dates
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
}

async function updateOrCreateMatch(matchData: Partial<Match>) {
    const homeTeam = await getTeam(matchData.homeTeam!.name, matchData.homeTeam!.logoUrl);
    const awayTeam = await getTeam(matchData.awayTeam!.name, matchData.awayTeam!.logoUrl);

    const filter = { source: matchData.source, externalId: matchData.externalId };
    const update = {
        ...matchData,
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        lastUpdatedAt: new Date(),
    };

    await MatchModel.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function fetchFromSource(name: string, fetchFn: () => Promise<any[]>, transformFn: (item: any) => Promise<void>) {
    console.log(`Fetching from ${name}...`);
    try {
        const items = await fetchFn();
        if (!items || items.length === 0) {
            console.log(`No items found from ${name}.`);
            return;
        }
        for (const item of items) {
            await transformFn(item);
        }
        console.log(`Successfully fetched and processed items from ${name}.`);
    } catch (error) {
        console.error(`Failed to fetch from ${name}:`, error);
    }
}

async function main() {
    await dbConnect();

    await fetchFromSource(
        'Soccerdataapi.com',
        async () => {
            if (!SOCCERDATA_API_KEY) {
                console.error("SOCCERDATA_API_KEY not found in .env file.");
                return [];
            }
            try {
                const response = await fetch(`${SOCCERDATA_BASE_URL}/livescores/?auth_token=${SOCCERDATA_API_KEY}`, {
                    headers: { 'Accept-Encoding': 'gzip' }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.detail) {
                         console.warn(`Soccerdataapi.com API returned an error: ${data.detail}`);
                         return [];
                    }
                    // Flatten the matches from all leagues into one array
                    return data.flatMap((league: SoccerDataLeague) => league.matches || []);
                } else {
                    console.warn(`Soccerdataapi.com API request failed with status: ${response.status}`);
                    const errorText = await response.text();
                    console.warn(`Response: ${errorText}`);
                }
            } catch (error) {
                console.warn(`Could not fetch from Soccerdataapi.com`, error);
            }
            return [];
        },
        async (match: SoccerDataMatch) => {
            if (!match.teams?.home?.name || !match.teams?.away?.name || match.status === 'finished') return;
            
            const getStatus = (apiStatus: string): 'scheduled' | 'in-progress' | 'finished' | 'postponed' | 'canceled' => {
                switch(apiStatus) {
                    case 'not_started': return 'scheduled';
                    case 'inplay': return 'in-progress';
                    case 'finished': return 'finished';
                    default: return 'scheduled';
                }
            }

            const matchData: Partial<Match> = {
                source: 'footballjson', // Keep source consistent for now
                externalId: match.id.toString(),
                leagueCode: match.league_name,
                season: new Date().getFullYear().toString(), // API doesn't provide season here
                matchDateUtc: parseMatchDate(match.date, match.time).toISOString(),
                status: getStatus(match.status),
                homeTeam: { name: match.teams.home.name, logoUrl: '' } as Team,
                awayTeam: { name: match.teams.away.name, logoUrl: '' } as Team,
            };
            await updateOrCreateMatch(matchData);
        }
    );

    console.log('Data fetching complete.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
