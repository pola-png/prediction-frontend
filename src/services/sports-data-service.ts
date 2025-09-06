
import type { Match, Team } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import HistoryModel from '@/models/History';


// --- TheSportsDB Integration ---
const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json/1';
const THESPORTSDB_LEAGUE_IDS = [
    '4328', // English Premier League
    '4329', // English League Championship
    '4330', // Scottish Premier League
    '4331', // German Bundesliga
    '4332', // Italian Serie A
    '4334', // French Ligue 1
    '4335', // Spanish La Liga
    '4337', // Dutch Eredivisie
    '4338', // Portuguese Primeira Liga
    '4339', // American MLS
    '4344', // Polish Ekstraklasa
    '4346', // Swedish Allsvenskan
    '4350', // Norwegian Eliteserien
    '4351', // Romanian Liga 1
    '4355', // Finnish Veikkausliiga
    '4356', // UEFA Champions League
    '4387', // English League One
    '4388', // English League Two
    '4394', // English FA Cup
    '4401', // English Carabao Cup
    '4655', // Turkish Super Lig
    '4722', // Danish Superliga
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
const OPENLIGADB_LEAGUE_SHORTCUTS = ['bl1', 'bl2', 'bl3']; // Top 3 German leagues

interface OpenligaDBMatch {
    matchID: number; matchDateTimeUTC: string; team1: { teamName: string; teamIconUrl: string };
    team2: { teamName: string; teamIconUrl: string }; leagueId: number;
    leagueName: string; leagueSeason: string; matchResults: { resultID: number; pointsTeam1: number; pointsTeam2: number }[];
}

const teamCache = new Map<string, Team>();

async function getTeam(teamName: string, logoUrl: string, externalId?: string): Promise<Team> {
    const cacheKey = teamName;
    if (teamCache.has(cacheKey)) {
        return teamCache.get(cacheKey)!;
    }
    const team: Team = { _id: externalId || new Date().toISOString(), name: teamName, logoUrl: logoUrl || `https://picsum.photos/seed/${teamName.replace(/\s+/g, '')}/40/40` };
    teamCache.set(cacheKey, team);
    return team;
}


async function transformTheSportsDBEvent(event: TheSportsDBEvent): Promise<Match | null> {
   try {
    const homeTeam = await getTeam(event.strHomeTeam, event.strHomeTeamBadge, event.idHomeTeam);
    const awayTeam = await getTeam(event.strAwayTeam, event.strAwayTeamBadge, event.idAwayTeam);
    const matchDateUtc = new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}Z`);
    const existingMatch = await MatchModel.findOne({ source: 'footballjson', externalId: event.idEvent }).populate('prediction');

    return {
        _id: existingMatch?._id.toString() || event.idEvent,
        source: 'footballjson',
        externalId: event.idEvent,
        leagueCode: event.idLeague,
        season: event.strSeason.split('-')[0],
        matchDateUtc: matchDateUtc.toISOString(),
        status: 'scheduled',
        homeTeam,
        awayTeam,
        prediction: existingMatch ? (existingMatch.prediction as any) : undefined,
        lastUpdatedAt: new Date().toISOString(),
        createdAt: existingMatch?.createdAt.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    } catch(e) {
        console.error("Failed to transform TheSportsDB event", e);
        return null;
    }
}

async function getUpcomingMatchesFromTheSportsDB(limit: number): Promise<Match[]> {
    let allEvents: TheSportsDBEvent[] = [];
    for (const leagueId of THESPORTSDB_LEAGUE_IDS) {
        try {
            const response = await fetch(`${THESPORTSDB_BASE_URL}/eventsnextleague.php?id=${leagueId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.events) allEvents.push(...data.events);
            }
        } catch (error) {
            console.warn(`Could not fetch from TheSportsDB for league ${leagueId}`, error);
        }
    }
    allEvents.sort((a, b) => new Date(`${a.dateEvent}T${a.strTime || '00:00:00'}Z`).getTime() - new Date(`${b.dateEvent}T${b.strTime || '00:00:00'}Z`).getTime());
    const transformedEvents = await Promise.all(allEvents.slice(0, limit).map(transformTheSportsDBEvent));
    return transformedEvents.filter(m => m !== null) as Match[];
}


async function transformOpenligaDBMatch(match: OpenligaDBMatch): Promise<Match | null> {
    try {
        const homeTeam = await getTeam(match.team1.teamName, match.team1.teamIconUrl);
        const awayTeam = await getTeam(match.team2.teamName, match.team2.teamIconUrl);
        const existingMatch = await MatchModel.findOne({ source: 'openligadb', externalId: match.matchID.toString() }).populate('prediction');
        
        return {
            _id: existingMatch?._id.toString() || match.matchID.toString(),
            source: 'openligadb',
            externalId: match.matchID.toString(),
            leagueCode: match.leagueName,
            season: match.leagueSeason,
            matchDateUtc: match.matchDateTimeUTC,
            status: 'scheduled',
            homeTeam,
            awayTeam,
            prediction: existingMatch ? (existingMatch.prediction as any) : undefined,
            lastUpdatedAt: new Date().toISOString(),
            createdAt: existingMatch?.createdAt.toISOString() || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    } catch (e) {
        console.error("Failed to transform OpenLigaDB event", e);
        return null;
    }
}


async function getUpcomingMatchesFromOpenligaDB(limit: number): Promise<Match[]> {
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
            console.warn(`Could not fetch from OpenligaDB for league ${league}`, error);
        }
    }
    allMatches.sort((a, b) => new Date(a.matchDateTimeUTC).getTime() - new Date(b.matchDateTimeUTC).getTime());
    const transformedMatches = await Promise.all(allMatches.slice(0, limit).map(transformOpenligaDBMatch));
    return transformedMatches.filter(m => m !== null) as Match[];
}


export async function getUpcomingMatches(limit = 15): Promise<Match[]> {
    await dbConnect();

    const sportsDbMatchesPromise = getUpcomingMatchesFromTheSportsDB(limit);
    const openligaDbMatchesPromise = getUpcomingMatchesFromOpenligaDB(limit);

    const [sportsDbMatches, openligaDbMatches] = await Promise.all([
        sportsDbMatchesPromise,
        openligaDbMatchesPromise
    ]);

    const combined = [...sportsDbMatches, ...openligaDbMatches];
    
    if (combined.length > 0) {
      const uniqueMatches = Array.from(new Map(combined.map(m => [`${m.homeTeam.name}-${m.awayTeam.name}-${m.matchDateUtc.slice(0,10)}`, m])).values());
      uniqueMatches.sort((a,b) => new Date(a.matchDateUtc).getTime() - new Date(b.matchDateUtc).getTime());
      return uniqueMatches.slice(0, limit);
    }
    
    return [];
}
