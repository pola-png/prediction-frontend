
import 'dotenv/config';
import type { Match, Team } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import fetch from 'node-fetch';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/openfootball/football.json/master';

interface FootballJsonMatch {
    date: string; // "2023-08-11"
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

const teamCache = new Map<string, any>();

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


async function updateOrCreateMatch(matchData: Partial<Match>) {
    const homeTeam = await getTeam(matchData.homeTeam!.name);
    const awayTeam = await getTeam(matchData.awayTeam!.name);

    const filter = { source: matchData.source, externalId: matchData.externalId };
    const update = {
        ...matchData,
        homeTeam: homeTeam._id,
        awayTeam: awayTeam._id,
        status: 'finished' as 'finished', // All historical data is finished
        lastUpdatedAt: new Date(),
    };

    await MatchModel.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function fetchFromSource(name: string, fetchFn: () => Promise<any[]>, transformFn: (item: any, leagueName: string) => Promise<void>) {
    console.log(`Fetching from ${name}...`);
    try {
        const leagues = await fetchFn();
        if (!leagues || leagues.length === 0) {
            console.log(`No leagues found from ${name}.`);
            return;
        }
        for (const league of leagues) {
            const leagueName = league.name;
            if (!league.matches || league.matches.length === 0) {
                console.log(`No matches found for league ${leagueName}.`);
                continue;
            }
            console.log(`Processing ${league.matches.length} matches for ${leagueName}...`);
            for (const item of league.matches) {
                await transformFn(item, leagueName);
            }
        }
        console.log(`Successfully fetched and processed items from ${name}.`);
    } catch (error) {
        console.error(`Failed to fetch from ${name}:`, error);
    }
}


const leaguesToFetch = [
    '2023-24/en.1.json', // English Premier League
    '2023-24/es.1.json', // Spanish La Liga
    '2023-24/de.1.json', // German Bundesliga
    '2023-24/it.1.json', // Italian Serie A
    '2023-24/fr.1.json', // French Ligue 1
];

async function main() {
    await dbConnect();

    await fetchFromSource(
        'football.json',
        async () => {
            const allLeaguesData = [];
            for(const leagueFile of leaguesToFetch) {
                try {
                    const response = await fetch(`${GITHUB_BASE_URL}/${leagueFile}`);
                    if (response.ok) {
                        const data: FootballJsonLeague = await response.json() as FootballJsonLeague;
                        allLeaguesData.push(data);
                    } else {
                        console.warn(`Failed to fetch ${leagueFile}: ${response.statusText}`);
                    }
                } catch(error) {
                    console.error(`Error fetching ${leagueFile}:`, error);
                }
            }
            return allLeaguesData;
        },
        async (match: FootballJsonMatch, leagueName: string) => {
            if (!match.team1 || !match.team2 || !match.score) return;

            const matchData: Partial<Match> = {
                source: 'footballjson',
                // create a unique ID based on date and teams
                externalId: `${match.date}-${slugify(match.team1)}-${slugify(match.team2)}`, 
                leagueCode: leagueName,
                season: '2023/2024',
                matchDateUtc: new Date(match.date).toISOString(),
                status: 'finished',
                homeTeam: { name: match.team1 } as Team,
                awayTeam: { name: match.team2 } as Team,
                homeGoals: match.score.ft[0],
                awayGoals: match.score.ft[1],
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
