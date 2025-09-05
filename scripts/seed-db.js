
require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const { upcomingMatches, finishedMatches } = require('../src/lib/mock-data-for-seeding');

// Correctly handle module exports for JS/TS interop by accessing the .default property
const Team = require('../src/models/Team').default;
const Match = require('../src/models/Match').default;
const Prediction = require('../src/models/Prediction').default;
const History = require('../src/models/History').default;


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

    // Clear existing data
    await History.deleteMany({});
    await Prediction.deleteMany({});
    await Match.deleteMany({});
    await Team.deleteMany({});
    console.log('Cleared existing data.');

    const allMatches = [...upcomingMatches, ...finishedMatches];

    // Seed Teams
    const allTeams = [];
    allMatches.forEach(match => {
      allTeams.push(match.homeTeam);
      allTeams.push(match.awayTeam);
    });

    const uniqueTeams = allTeams.reduce((acc, current) => {
        if (!acc.find(item => item.name === current.name)) {
            acc.push(current);
        }
        return acc;
    }, []);

    const createdTeams = await Team.insertMany(uniqueTeams.map(t => ({ name: t.name, logoUrl: t.logoUrl })));
    console.log(`Seeded ${createdTeams.length} teams.`);

    const teamMap = new Map(createdTeams.map(t => [t.name, t._id]));

    // Seed Matches, Predictions, and History
    for (const matchData of allMatches) {
        const homeTeamId = teamMap.get(matchData.homeTeam.name);
        const awayTeamId = teamMap.get(matchData.awayTeam.name);

        if (!homeTeamId || !awayTeamId) {
            console.warn(`Could not find teams for match: ${matchData.homeTeam.name} vs ${matchData.awayTeam.name}`);
            continue;
        }

        const match = new Match({
            ...matchData,
            homeTeam: homeTeamId,
            awayTeam: awayTeamId,
        });

        if (matchData.prediction) {
            const prediction = new Prediction({
                ...matchData.prediction,
                matchId: match._id,
            });
            await prediction.save();
            match.prediction = prediction._id;

            if (matchData.history) {
                 const history = new History({
                    ...matchData.history,
                    matchId: match._id,
                    predictionId: prediction._id,
                });
                await history.save();
            }
        }
        
        await match.save();
    }

    console.log(`Seeded ${allMatches.length} matches and their predictions/history.`);
    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedDB();
