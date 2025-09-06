
import type { Match, Team } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';

// --- TheSportsDB Integration ---
const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json/1';
const THESPORTSDB_LEAGUE_IDS = [
    '4328', '4329', '4330', '4331', '4332', '4334', '4335', '4337',
    '4338', '4339', '4344', '4346', '4350', '4351', '4355', '4356',
    '4387', '4388', '4394', '4401', '4655', '4722'
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
const OPENLIGADB_LEAGUE_SHORTCUTS = ['bl1', 'bl2', 'bl3'];

interface OpenligaDBMatch {
    matchID: number; matchDateTimeUTC: string; team1: { teamName: string; teamIconUrl: string };
    team2: { teamName: string; teamIconUrl: string }; leagueId: number;
    leagueName: string; leagueSeason: string; matchResults: { resultID: number; pointsTeam1: number; pointsTeam2: number }[];
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

    await fetchFromSource(
        'TheSportsDB',
        async () => {
            let allEvents: TheSportsDBEvent[] = [];
            for (const leagueId of THESPORTSDB_LEAGUE_IDS) {
                try {
                    const response = await fetch(`${THESPORTSDB_BASE_URL}/eventsnextleague.php?id=${leagueId}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.events) allEvents.push(...data.events);
                    }
                } catch (error) {
                    console.warn(`Could not fetch from TheSportsDB for league ${leagueId}`);
                }
            }
            return allEvents;
        },
        async (event: TheSportsDBEvent) => {
            const matchData: Partial<Match> = {
                source: 'footballjson',
                externalId: event.idEvent,
                leagueCode: event.idLeague,
                season: event.strSeason.split('-')[0],
                matchDateUtc: new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}Z`).toISOString(),
                homeTeam: { name: event.strHomeTeam, logoUrl: event.strHomeTeamBadge } as Team,
                awayTeam: { name: event.strAwayTeam, logoUrl: event.strAwayTeamBadge } as Team,
            };
            await updateOrCreateMatch(matchData);
        }
    );

    await fetchFromSource(
        'OpenLigaDB',
        async () => {
            let allMatches: OpenligaDBMatch[] = [];
            const now = new Date();
            for (const league of OPENLIGADB_LEAGUE_SHORTCUTS) {
                try {
                    const response = await fetch(`${OPENLIGADB_BASE_URL}/getmatchdata/${league}`);
                    if (response.ok) {
                        const data: OpenligaDBMatch[] = await response.json();
                        const upcoming = data.filter(m => new Date(m.matchDateTimeUTC) > now && !m.matchResults.some(r => r.resultID !== 0));
                        allMatches.push(...upcoming);
                    }
                } catch (error) {
                    console.warn(`Could not fetch from OpenligaDB for league ${league}`);
                }
            }
            return allMatches;
        },
        async (match: OpenligaDBMatch) => {
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
