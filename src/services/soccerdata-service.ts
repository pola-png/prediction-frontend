
'use server';

import type { Match, Team } from "@/lib/types";

const API_KEY = process.env.SOCCERDATA_API_KEY;
const BASE_URL = 'https://api.soccerdata.com/v1/matches'; // This is a placeholder URL

if (!API_KEY) {
    console.warn("SOCCERDATA_API_KEY is not set. Live data fetching will be disabled.");
}

interface SoccerDataMatch {
    match_id: number;
    league_id: number;
    season_id: number;
    start_date: string; // "2024-08-17 14:00:00"
    status: 'not started' | 'finished' | 'in progress';
    home_team: {
        team_id: number;
        name: string;
    };
    away_team: {
        team_id: number;
        name: string;
    };
    stats?: {
        ft_score: string; // "2-1"
    }
}

function mapStatus(status: 'not started' | 'finished' | 'in progress'): Match['status'] {
    switch(status) {
        case 'not started': return 'scheduled';
        case 'finished': return 'finished';
        case 'in progress': return 'in-progress';
        default: return 'scheduled';
    }
}


export async function fetchFromSoccerDataApi(): Promise<Partial<Match>[]> {
    if (!API_KEY) {
        return [];
    }
    
    console.log('Fetching live data from SoccerData API...');
    
    try {
        // This should be replaced with a real API call
        // const response = await fetch(`${BASE_URL}?apikey=${API_KEY}&live=true`);
        // const data = await response.json();
        const data: { matches: SoccerDataMatch[] } = { matches: [] }; // Placeholder for real data
        
        if (!data.matches || data.matches.length === 0) {
            console.log('No live matches found from SoccerData API.');
            return [];
        }

        return data.matches.map((match: SoccerDataMatch) => {
            let homeGoals: number | undefined;
            let awayGoals: number | undefined;

            if (match.stats?.ft_score) {
                [homeGoals, awayGoals] = match.stats.ft_score.split('-').map(Number);
            }

            const mappedMatch: Partial<Match> = {
                source: 'soccerdataapi',
                externalId: String(match.match_id),
                leagueCode: String(match.league_id),
                season: String(match.season_id),
                matchDateUtc: new Date(match.start_date).toISOString(),
                status: mapStatus(match.status),
                homeTeam: { name: match.home_team.name } as Team,
                awayTeam: { name: match.away_team.name } as Team,
                homeGoals: homeGoals,
                awayGoals: awayGoals,
            };
            return mappedMatch;
        });

    } catch (error) {
        console.error('Failed to fetch from SoccerData API:', error);
        return [];
    }
}
