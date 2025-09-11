import Match from '../models/match.js';
import { fetchMatches } from '../services/apiService.js';

export const getMatches = async (req, res) => {
  try {
    const matches = await Match.find();
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchAndStoreMatches = async (req, res) => {
  // Simple token-based authentication
  if (req.query.token !== 'supersecret123') {
    return res.status(401).send('Unauthorized');
  }

  try {
    const matchesFromApi = await fetchMatches();
    // Using a set to track unique IDs from the API
    const apiMatchIds = new Set(matchesFromApi.map(m => m.id));

    // Delete matches from DB that are no longer in the API response
    await Match.deleteMany({ id: { $not: { $in: [...apiMatchIds] } } });
    
    const operations = matchesFromApi.map(matchData => ({
      updateOne: {
        filter: { id: matchData.id },
        update: matchData,
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await Match.bulkWrite(operations);
    }
    
    res.status(200).json({
      message: `${operations.length} matches fetched and stored successfully.`,
    });
  } catch (error) {
    console.error('Error fetching and storing matches:', error);
    res.status(500).json({ message: 'Error fetching and storing matches' });
  }
};
