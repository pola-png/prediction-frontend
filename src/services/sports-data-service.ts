
import type { Match, Team, Prediction } from '@/lib/types';
import MatchModel from '@/models/Match';
import dbConnect from '@/lib/mongodb';
import TeamModel from '@/models/Team';
import PredictionModel from '@/models/Prediction';
import HistoryModel from '@/models/History';
import { generateMatchPredictions, type GenerateMatchPredictionsInput } from '@/ai/flows/generate-match-predictions';


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
    // Extended list
    '4347', '4348', '4349', '4354', '4358',
    '4359', '4369', '4370', '4371', '4380',
    '4381', '4389', '4390', '4391', '4396',
    '4405', '4406', '4407', '4408', '4414',
    '4415', '4416', '4425', '4428', '4429',
    '4431', '4432', '4435', '4436', '4438',
    '4439', '4452', '4453', '4457', '4461',
    '4462', '4463', '4479', '4480', '4481',
    '4482', '4483', '4484', '4493', '4494',
    '4495', '4502', '4503', '4504', '4509',
    '4510', '4518', '4519', '4520', '4521',
    '4543', '4558', '4559', '4563', '4564',
    '4568', '4569', '4585', '4586', '4587',
    '4591', '4602', '4603', '4613', '4615',
    '4617', '4623', '4628', '4632', '4634',
    '4636', '4637', '4638', '4639', '4640',
    '4641', '4642', '4643', '4644', '4651',
    '4652', '4653', '4654', '4656', '4657',
    '4658', '4659', '4665', '4666', '4684',
    '4685', '4693', '4694', '4695', '4700',
    '4701', '4702', '4703', '4704', '4705',
    '4707', '4708', '4720', '4721', '4723',
    '4733', '4734', '4742', '4743', '4744',
    '4745', '4746', '4747', '4748', '4762',
    '4763', '4764', '4765', '4766', '4767',
    '4768', '4769', '4770', '4771', '4772',
    '4773', '4774', '4775', '4776', '4777',
    '4778', '4779', '4780', '4781', '4782',
    '4783', '4784', '4785', '4786', '4787',
    '4788', '4789', '4790', '4791', '4792',
    '4793', '4794', '4795', '4796', '4797',
    '4798', '4799', '4800', '4801', '4802',
    '4803', '4804', '4805', '4806', '4807',
    '4808', '4809', '4810', '4811', '4812',
    '4813', '4814', '4815', '4816', '4817',
    '4818', '4819', '4820', '4821', '4822',
    '4823', '4824', '4825', '4826', '4827',
    '4828', '4829', '4830', '4831', '4832',
    '4833', '4834', '4835', '4836', '4837',
    '4838', '4839', '4840', '4841', '4842',
    '4843', '4844', '4845', '4846', '4847',
    '4848', '4849', '4850', '4851', '4852',
    '4853', '4854', '4855', '4856', '4857',
    '4858', '4859', '4860', '4861', '4862',
    '4863', '4864', '4865', '4866', '4867',
    '4868', '4869', '4870', '4871', '4872',
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

    await dbConnect();
    let team = await TeamModel.findOne({ name: teamName });

    if (!team) {
        team = new TeamModel({
            name: teamName,
            logoUrl: logoUrl || `https://picsum.photos/seed/${teamName.replace(/\s+/g, '')}/40/40`,
        });
        await team.save();
    }
    
    const teamObject = team.toObject({ virtuals: true }) as Team;
    teamCache.set(cacheKey, teamObject);
    return teamObject;
}

async function getOrCreateMatch(matchData: Partial<Match>): Promise<Match> {
    await dbConnect();
    const existingMatch = await MatchModel.findOne({ source: matchData.source, externalId: matchData.externalId })
      .populate('homeTeam')
      .populate('awayTeam')
      .populate('prediction');

    if (existingMatch) {
      return existingMatch.toObject({ virtuals: true }) as Match;
    }

    const homeTeam = await getTeam(matchData.homeTeam!.name, matchData.homeTeam!.logoUrl);
    const awayTeam = await getTeam(matchData.awayTeam!.name, matchData.awayTeam!.logoUrl);

    const newMatch = new MatchModel({
      ...matchData,
      homeTeam: homeTeam._id,
      awayTeam: awayTeam._id,
      status: 'scheduled',
    });
    
    await newMatch.save();
    const populatedMatch = await MatchModel.findById(newMatch._id).populate('homeTeam').populate('awayTeam');
    return populatedMatch!.toObject({ virtuals: true }) as Match;
}


async function transformTheSportsDBEvent(event: TheSportsDBEvent): Promise<Match | null> {
   try {
    const homeTeam = { name: event.strHomeTeam, logoUrl: event.strHomeTeamBadge };
    const awayTeam = { name: event.strAwayTeam, logoUrl: event.strAwayTeamBadge };
    const matchDateUtc = new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}Z`);

    const partialMatch: Partial<Match> = {
        source: 'footballjson',
        externalId: event.idEvent,
        leagueCode: event.idLeague,
        season: event.strSeason.split('-')[0],
        matchDateUtc: matchDateUtc.toISOString(),
        homeTeam: homeTeam as Team,
        awayTeam: awayTeam as Team,
    };
    
    return await getOrCreateMatch(partialMatch);
    } catch(e) {
        console.error("Failed to transform TheSportsDB event", e);
        return null;
    }
}

async function getUpcomingMatchesFromTheSportsDB(): Promise<Match[]> {
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
    const transformedEvents = await Promise.all(allEvents.map(transformTheSportsDBEvent));
    return transformedEvents.filter(m => m !== null) as Match[];
}


async function transformOpenligaDBMatch(match: OpenligaDBMatch): Promise<Match | null> {
    try {
        const homeTeam = { name: match.team1.teamName, logoUrl: match.team1.teamIconUrl };
        const awayTeam = { name: match.team2.teamName, logoUrl: match.team2.teamIconUrl };
       
        const partialMatch: Partial<Match> = {
            source: 'openligadb',
            externalId: match.matchID.toString(),
            leagueCode: match.leagueName,
            season: match.leagueSeason,
            matchDateUtc: match.matchDateTimeUTC,
            homeTeam: homeTeam as Team,
            awayTeam: awayTeam as Team,
        };
        return await getOrCreateMatch(partialMatch);
    } catch (e) {
        console.error("Failed to transform OpenLigaDB event", e);
        return null;
    }
}


async function getUpcomingMatchesFromOpenligaDB(): Promise<Match[]> {
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
    const transformedMatches = await Promise.all(allMatches.map(transformOpenligaDBMatch));
    return transformedMatches.filter(m => m !== null) as Match[];
}

async function getLiveUpcomingMatches(limit: number): Promise<Match[]> {
    const sportsDbMatchesPromise = getUpcomingMatchesFromTheSportsDB();
    const openligaDbMatchesPromise = getUpcomingMatchesFromOpenligaDB();

    const [sportsDbMatches, openligaDbMatches] = await Promise.all([
        sportsDbMatchesPromise,
        openligaDbMatchesPromise,
    ]);
    
    const combined = [...sportsDbMatches, ...openligaDbMatches];
    
    if (combined.length > 0) {
      const uniqueMatches = Array.from(new Map(combined.map(m => [`${m.homeTeam.name}-${m.awayTeam.name}-${m.matchDateUtc.slice(0,10)}`, m])).values());
      uniqueMatches.sort((a,b) => new Date(a.matchDateUtc).getTime() - new Date(b.matchDateUtc).getTime());
      return uniqueMatches.slice(0, limit);
    }
    
    return [];
}


async function getAndGeneratePredictions(matches: Match[]): Promise<Match[]> {
  const matchesWithPredictions: Match[] = [];

  for (const match of matches) {
    if (match.prediction) {
      matchesWithPredictions.push(match);
      continue;
    }
    
    try {
      console.log(`Generating prediction for match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      const predictionInput: GenerateMatchPredictionsInput = {
        teamFormWeight: 0.4,
        h2hWeight: 0.3,
        homeAdvWeight: 0.2,
        goalsWeight: 0.1,
        matchDetails: `${match.homeTeam.name} vs ${match.awayTeam.name} on ${match.matchDateUtc}`,
        teamAForm: 'Not available',
        teamBForm: 'Not available',
        headToHeadStats: 'Not available',
        teamAGoals: 'Not available',
        teamBGoals: 'Not available',
      };

      const predictionResult = await generateMatchPredictions(predictionInput);

      const newPrediction = new PredictionModel({
        matchId: match._id,
        version: '1.0',
        features: {
            teamFormWeight: predictionInput.teamFormWeight,
            h2hWeight: predictionInput.h2hWeight,
            homeAdvWeight: predictionInput.homeAdvWeight,
            goalsWeight: predictionInput.goalsWeight,
        },
        outcomes: predictionResult,
        confidence: predictionResult.confidence,
        bucket: predictionResult.bucket,
      });

      const savedPrediction = await newPrediction.save();

      await MatchModel.findByIdAndUpdate(match._id, { prediction: savedPrediction._id });

      const fullPrediction: Prediction = savedPrediction.toObject({ virtuals: true });
      matchesWithPredictions.push({ ...match, prediction: fullPrediction });
      
    } catch (error) {
      console.error(`Failed to generate or save prediction for match ${match._id}:`, error);
      // Add match without prediction if generation fails
      matchesWithPredictions.push(match);
    }
  }

  return matchesWithPredictions;
}


export async function getUpcomingMatches(limit = 15): Promise<Match[]> {
    await dbConnect();
    const liveMatches = await getLiveUpcomingMatches(limit);
    const matchesWithPredictions = await getAndGeneratePredictions(liveMatches);
    return matchesWithPredictions;
}