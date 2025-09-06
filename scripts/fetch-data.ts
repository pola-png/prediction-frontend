
import 'dotenv/config';
import type { Match, Team } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';

// --- TheSportsDB Integration ---
const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '3'; // Use '3' as a more capable free key
const THESPORTSDB_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}`;
const THE_SPORTS_DB_LEAGUES = [
    '4328', // English Premier League
    '4335', // Spanish La Liga
    '4332', // German Bundesliga
    '4331', // Italian Serie A
    '4334', // French Ligue 1
];

interface TheSportsDBEvent {
    idEvent: string; strEvent: string; idLeague: string; strLeague: string;
    strSeason: string; dateEvent: string; strTime: string; idHomeTeam: string;
    strHomeTeam: string; idAwayTeam: string; strAwayTeam: string;
    intHomeScore: string | null; intAwayScore: string | null; strStatus: string;
    strHomeTeamBadge: string; strAwayTeamBadge: string;
}

// --- OpenligaDB Integration ---
const OPENLIGADB_BASE_URL = 'https://api.openligadb.de';
const OPENLIGA_DB_LEAGUES = ['bl1', 'bl2', 'bl3']; // German Leagues

interface OpenligaDBMatch {
    matchID: number; matchDateTimeUTC: string; team1: { teamName: string; teamIconUrl: string };
    team2: { teamName: string; teamIconUrl: string }; leagueId: number;
    leagueName: string; leagueSeason: string; matchIsFinished: boolean; matchResults: { resultID: number; pointsTeam1: number; pointsTeam2: number }[];
    group: { groupOrderID: number };
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

async function updateOrCreateMatch(matchData: Partial<Match>) {
    const homeTeam = await getTeam(matchData.homeTeam!.name, matchData.homeTeam!.logoUrl);
    const awayTeam = await getTeam(matchData.awayTeam!.name, matchData.awayTeam!.logoUrl);

    const filter = { source: matchData.source, externalId: matchData.externalId };
    const update = {
        ...matchData,
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        status: 'scheduled',
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
        console.log(`Successfully fetched and processed ${items.length} items from ${name}.`);
    } catch (error) {
        console.error(`Failed to fetch from ${name}:`, error);
    }
}

async function main() {
    await dbConnect();
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    // --- Fetch from TheSportsDB ---
    await fetchFromSource(
        'TheSportsDB',
        async () => {
            let allEvents: TheSportsDBEvent[] = [];
            for (const leagueId of THE_SPORTS_DB_LEAGUES) {
                try {
                    const response = await fetch(`${THESPORTSDB_BASE_URL}/eventsnextleague.php?id=${leagueId}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.events) {
                            allEvents.push(...data.events);
                        }
                    } else {
                        console.warn(`TheSportsDB API request failed for league ${leagueId} with status: ${response.status}`);
                    }
                } catch (error) {
                    console.warn(`Could not fetch from TheSportsDB for league ${leagueId}`, error);
                }
            }
            return allEvents;
        },
        async (event: TheSportsDBEvent) => {
            if (!event.strHomeTeam || !event.strAwayTeam) return;
            const matchData: Partial<Match> = {
                source: 'footballjson',
                externalId: event.idEvent,
                leagueCode: event.strLeague,
                season: event.strSeason.split('-')[0],
                matchDateUtc: new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}Z`).toISOString(),
                homeTeam: { name: event.strHomeTeam, logoUrl: event.strHomeTeamBadge } as Team,
                awayTeam: { name: event.strAwayTeam, logoUrl: event.strAwayTeamBadge } as Team,
            };
            await updateOrCreateMatch(matchData);
        }
    );

    // --- Fetch from OpenLigaDB ---
    await fetchFromSource(
        'OpenLigaDB',
        async () => {
            let allMatches: OpenligaDBMatch[] = [];
            for (const league of OPENLIGA_DB_LEAGUES) {
                 try {
                    const response = await fetch(`${OPENLIGADB_BASE_URL}/getmatchesbydate/${today}`);
                     if (response.ok) {
                        const data: OpenligaDBMatch[] = await response.json();
                        allMatches.push(...data.filter(m => !m.matchIsFinished));
                    } else {
                        console.warn(`OpenLigaDB API request failed for league ${league} on date ${today} with status: ${response.status}`);
                    }
                 } catch (error) {
                    console.warn(`Could not fetch from OpenLigaDB for league ${league} on date ${today}`, error);
                 }
            }
            return allMatches;
        },
        async (match: OpenligaDBMatch) => {
            if (!match.team1?.teamName || !match.team2?.teamName) return;
            const matchData: Partial<Match> = {
                source: 'openligadb',
                externalId: match.matchID.toString(),
                leagueCode: match.leagueName,
                season: match.leagueSeason,
                matchDateUtc: match.matchDateTimeUTC,
                homeTeam: { name: match.team1.teamName, logoUrl: match.team1.teamIconUrl } as Team,
                awayTeam: { name: match.team2.teamName, logoUrl: match.team2.teamIconUrl } as Team,
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
