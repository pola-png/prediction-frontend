
// src/services/sports-data-service.ts
import type { Match, Team } from '@/lib/types';
import MatchModel from '@/models/Match';
import TeamModel from '@/models/Team';
import dbConnect from '@/lib/mongodb';


const API_KEY = process.env.THESPORTSDB_API_KEY || '1';
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

// A list of popular league IDs from TheSportsDB
const POPULAR_LEAGUE_IDS = [
    '4328', // English Premier League
    '4335', // Spanish La Liga
    '4331', // German Bundesliga
    '4332', // Italian Serie A
    '4334', // French Ligue 1
];

interface TheSportsDBEvent {
    idEvent: string;
    strEvent: string;
    idLeague: string;
    strLeague: string;
    strSeason: string;
    dateEvent: string;
    strTime: string;
    idHomeTeam: string;
    strHomeTeam: string;
    idAwayTeam: string;
    strAwayTeam: string;
    intHomeScore: string | null;
    intAwayScore: string | null;
    strStatus: string;
    strHomeTeamBadge: string;
    strAwayTeamBadge: string;
}

// A simple in-memory cache to avoid fetching the same team details repeatedly
const teamCache = new Map<string, Team>();

async function getTeamDetails(teamId: string): Promise<Team> {
    if (teamCache.has(teamId)) {
        return teamCache.get(teamId)!;
    }
    try {
        const response = await fetch(`${BASE_URL}/lookupteam.php?id=${teamId}`);
        const data = await response.json();
        const teamData = data.teams[0];
        const team: Team = {
            _id: teamData.idTeam,
            name: teamData.strTeam,
            logoUrl: teamData.strTeamBadge || 'https://picsum.photos/seed/placeholder/40/40'
        };
        teamCache.set(teamId, team);
        return team;
    } catch (error) {
        console.error(`Failed to fetch team details for ID ${teamId}:`, error);
        // Return a placeholder if the fetch fails
        return { _id: teamId, name: 'Unknown Team', logoUrl: 'https://picsum.photos/seed/unknown/40/40' };
    }
}


async function transformEventToMatch(event: TheSportsDBEvent): Promise<Match> {
    await dbConnect();
    const homeTeam = await getTeamDetails(event.idHomeTeam);
    const awayTeam = await getTeamDetails(event.idAwayTeam);

    const matchDateUtc = new Date(`${event.dateEvent}T${event.strTime}Z`);

    // Check if a prediction exists for this match in our DB
    const existingMatch = await MatchModel.findOne({ externalId: event.idEvent }).populate('prediction');

    return {
        _id: existingMatch?._id.toString() || event.idEvent,
        source: 'footballjson', // Keep source for consistency until fully migrated
        externalId: event.idEvent,
        leagueCode: event.idLeague,
        season: event.strSeason,
        matchDateUtc: matchDateUtc.toISOString(),
        status: 'scheduled',
        homeTeam,
        awayTeam,
        homeGoals: event.intHomeScore ? parseInt(event.intHomeScore) : undefined,
        awayGoals: event.intAwayScore ? parseInt(event.intAwayScore) : undefined,
        prediction: existingMatch ? existingMatch.prediction as any : undefined,
        lastUpdatedAt: new Date().toISOString(),
        createdAt: existingMatch?.createdAt.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}


export async function getUpcomingMatches(limit = 10): Promise<Match[]> {
    try {
        let allEvents: TheSportsDBEvent[] = [];

        for (const leagueId of POPULAR_LEAGUE_IDS) {
            const response = await fetch(`${BASE_URL}/eventsnextleague.php?id=${leagueId}`);
            if (!response.ok) {
                console.warn(`Failed to fetch upcoming matches for league ${leagueId}. Status: ${response.status}`);
                continue;
            }
            const data = await response.json();
            if (data.events) {
                allEvents.push(...data.events);
            }
        }
        
        // Sort events by date
        allEvents.sort((a, b) => {
             const dateA = new Date(`${a.dateEvent}T${a.strTime}Z`).getTime();
             const dateB = new Date(`${b.dateEvent}T${b.strTime}Z`).getTime();
             return dateA - dateB;
        });

        const upcomingMatches = await Promise.all(
            allEvents.slice(0, limit).map(transformEventToMatch)
        );

        return upcomingMatches;
    } catch (error) {
        console.error('Failed to fetch upcoming matches from TheSportsDB:', error);
        return [];
    }
}
