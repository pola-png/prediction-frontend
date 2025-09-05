
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import { getOpenFootballData, type OpenFootballMatch } from '../src/lib/openfootball-data';

import Team from '../src/models/Team';
import Match from '../src/models/Match';
import Prediction from '../src/models/Prediction';
import History from '../src/models/History';


async function seedDB() {
  const MONGODB_URI = process.env.MONGO_URI;

  if (!MONGODB_URI) {
    console.error('MONGO_URI is not defined in .env file');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    console.log('Connected to MongoDB.');

    await History.deleteMany({});
    await Prediction.deleteMany({});
    await Match.deleteMany({});
    await Team.deleteMany({});
    console.log('Cleared existing data.');

    const allMatches = await getOpenFootballData();
    console.log(`Fetched ${allMatches.length} matches from openfootball.`);

    const allTeams = new Map<string, { name: string, logoUrl: string }>();
    allMatches.forEach(match => {
        allTeams.set(match.team1, { name: match.team1, logoUrl: `https://picsum.photos/seed/${match.team1.replace(/\s+/g, '')}/40/40` });
        allTeams.set(match.team2, { name: match.team2, logoUrl: `https://picsum.photos/seed/${match.team2.replace(/\s+/g, '')}/40/40` });
    });

    const createdTeams = await Team.insertMany(Array.from(allTeams.values()));
    console.log(`Seeded ${createdTeams.length} teams.`);

    const teamMap = new Map(createdTeams.map(t => [t.name, t._id]));

    for (const matchData of allMatches) {
        const homeTeamId = teamMap.get(matchData.team1);
        const awayTeamId = teamMap.get(matchData.team2);

        if (!homeTeamId || !awayTeamId) {
            console.warn(`Could not find team IDs for match: ${matchData.team1} vs ${matchData.team2}`);
            continue;
        }

        const existingMatch = await Match.findOne({
            homeTeam: homeTeamId,
            awayTeam: awayTeamId,
            matchDateUtc: new Date(matchData.date)
        });
        if (existingMatch) continue;
        
        const match = new Match({
            source: 'openfootball',
            externalId: `${matchData.team1}-${matchData.team2}-${matchData.date}`,
            leagueCode: matchData.league,
            season: matchData.season,
            matchDateUtc: new Date(matchData.date),
            status: matchData.score ? 'finished' : 'scheduled',
            homeTeam: homeTeamId,
            awayTeam: awayTeamId,
            homeGoals: matchData.score?.ft[0],
            awayGoals: matchData.score?.ft[1],
            lastUpdatedAt: new Date(),
        });
        
        await match.save();
    }

    console.log(`Seeded ${allMatches.length} matches.`);
    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedDB();
