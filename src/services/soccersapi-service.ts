
'use server';

import type { Match, Team } from "@/lib/types";
import fetch from 'node-fetch';

const SOCCERSAPI_USER = process.env.SOCCERSAPI_USER;
const SOCCERSAPI_TOKEN = process.env.SOCCERSAPI_TOKEN;
const BASE_URL = 'https://api.soccersapi.com/v2.2';

if (!SOCCERSAPI_USER || !SOCCERSAPI_TOKEN) {
    console.warn("SoccersAPI credentials are not set. Live data fetching will be disabled.");
}

// See https://www.soccersapi.com/documentation/fixtures.html
interface SoccersApiMatch {
    id: number;
    league_id: number;
    season_id: number;
    date_time: string; // "2024-08-17 14:00:00"
    status: 'not started' | 'finished' | 'in progress' | 'postponed' | 'cancelled';
    home: {
        id: number;
        name: string;
        short_code: string;
        logo: string;
    };
    away: {
        id: number;
        name: string;
        short_code: string;
        logo: string;
    };
    score?: {
        ft_score: string; // "2-1"
    }
}

function mapStatus(status: SoccersApiMatch['status']): Match['status'] {
    switch(status) {
        case 'not started': return 'scheduled';
        case 'finished': return 'finished';
        case 'in progress': return 'in-progress';
        case 'postponed': return 'postponed';
        case 'cancelled': return 'canceled';
        default: return 'scheduled';
    }
}


export async function fetchFromSoccersApi(): Promise<Partial<Match>[]> {
    if (!SOCCERSAPI_USER || !SOCCERSAPI_TOKEN) {
        return [];
    }
    
    console.log('Fetching live data from SoccersAPI...');
    
    try {
        const response = await fetch(`${BASE_URL}/fixtures/?user=${SOCCERSAPI_USER}&token=${SOCCERSAPI_TOKEN}&t=upcoming`);
        const result: any = await response.json();
        
        if (result.error) {
            console.error('Error from SoccersAPI:', result.error.message, `(Code: ${result.error.code})`);
            return [];
        }
        
        const matches = result.data;
        if (!matches || matches.length === 0) {
            console.log('No upcoming matches found from SoccersAPI.');
            return [];
        }

        return matches.map((match: SoccersApiMatch) => {
            let homeGoals: number | undefined;
            let awayGoals: number | undefined;

            if (match.score?.ft_score) {
                [homeGoals, awayGoals] = match.score.ft_score.split('-').map(Number);
            }

            const mappedMatch: Partial<Match> = {
                source: 'soccerdataapi', // Keep as soccerdataapi for consistency in the DB
                externalId: String(match.id),
                leagueCode: String(match.league_id),
                season: String(match.season_id),
                matchDateUtc: new Date(match.date_time.replace(' ', 'T') + 'Z').toISOString(), // handle UTC time
                status: mapStatus(match.status),
                homeTeam: { name: match.home.name } as Team,
                awayTeam: { name: match.away.name } as Team,
                homeGoals: homeGoals,
                awayGoals: awayGoals,
            };
            return mappedMatch;
        });

    } catch (error) {
        console.error('Failed to fetch from SoccersAPI:', error);
        return [];
    }
}
