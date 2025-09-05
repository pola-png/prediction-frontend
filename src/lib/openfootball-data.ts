
export interface OpenFootballMatch {
    key: string;
    round: string;
    date: string;
    team1: string;
    team2: string;
    score?: {
        ft: [number, number];
        ht?: [number, number];
    };
    league: string;
    season: string;
}

const LEAGUE_CONFIG = {
    'en.1': { league: 'Premier League', season: '2023-24', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json' },
    'es.1': { league: 'La Liga', season: '2023-24', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/es.1.json' },
    'de.1': { league: 'Bundesliga', season: '2023-24', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/de.1.json' },
    'it.1': { league: 'Serie A', season: '2023-24', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/it.1.json' },
    'fr.1': { league: 'Ligue 1', season: '2023-24', url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/fr.1.json' },
};


export async function getOpenFootballData(): Promise<OpenFootballMatch[]> {
    let allMatches: OpenFootballMatch[] = [];

    for (const config of Object.values(LEAGUE_CONFIG)) {
        try {
            const response = await fetch(config.url);
            if (!response.ok) {
                console.warn(`Failed to fetch data for ${config.league}: ${response.statusText}`);
                continue;
            }
            const data = await response.json();
            const matchesWithMetadata = data.matches.map((match: any) => ({
                ...match,
                league: config.league,
                season: config.season,
            }));
            allMatches.push(...matchesWithMetadata);
        } catch (error) {
            console.error(`Error fetching or parsing data for ${config.league}:`, error);
        }
    }
    return allMatches;
}
