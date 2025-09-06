
'use server';

import type { Match } from "@/lib/types";
import MatchModel from "@/models/Match";
import { calculateMatchStats, type CalculateMatchStatsInput } from "@/ai/flows/calculate-match-stats";

export interface TeamStats {
    form: string;
    goals: string;
}

export interface MatchStats {
    teamA: TeamStats;
    teamB: TeamStats;
    h2h: string;
}


async function getHistoricalMatches(teamAId: string, teamBId: string, cutOffDate: string): Promise<Match[]> {
    const twentyMatches = await MatchModel.find({
        $or: [
            { homeTeam: teamAId },
            { awayTeam: teamAId },
            { homeTeam: teamBId },
            { awayTeam: teamBId },
        ],
        status: 'finished',
        matchDateUtc: { $lt: new Date(cutOffDate) }
    })
    .sort({ matchDateUtc: -1 })
    .limit(20)
    .populate('homeTeam')
    .populate('awayTeam')
    .lean();

    return twentyMatches as Match[];
}


export async function getMatchStats(match: Match): Promise<MatchStats> {
    const historicalMatches = await getHistoricalMatches(
        match.homeTeam._id,
        match.awayTeam._id,
        match.matchDateUtc
    );
    
    if (historicalMatches.length === 0) {
        return {
            teamA: { form: 'No recent matches', goals: '0' },
            teamB: { form: 'No recent matches', goals: '0' },
            h2h: 'No head-to-head history'
        };
    }

    const input: CalculateMatchStatsInput = {
        teamAName: match.homeTeam.name,
        teamBName: match.awayTeam.name,
        matches: historicalMatches.map(m => ({
            date: m.matchDateUtc,
            homeTeam: m.homeTeam.name,
            awayTeam: m.awayTeam.name,
            homeGoals: m.homeGoals!,
            awayGoals: m.awayGoals!,
        }))
    };
    
    const stats = await calculateMatchStats(input);

    return {
        teamA: { form: stats.teamAForm, goals: stats.teamAGoals },
        teamB: { form: stats.teamBForm, goals: stats.teamBGoals },
        h2h: stats.headToHeadStats,
    };
}
