
const Match = require('../models/Match');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const { fetchAndStoreMatches, generateAllPredictions, fetchAndStoreResults } = require('../services/cronService');
const { getSummaryFromAI } = require('../services/aiService');


// --- Frontend API Methods ---

exports.getDashboardData = async (req, res) => {
    try {
        const upcomingMatches = await Match.find({
            status: 'scheduled',
            prediction: { $exists: true }
        })
        .sort({ matchDateUtc: 1 })
        .limit(5)
        .populate('homeTeam awayTeam prediction')
        .lean();

        const recentResults = await Match.find({ status: 'finished' })
        .sort({ matchDateUtc: -1 })
        .limit(5)
        .populate('homeTeam awayTeam prediction')
        .lean();
        
        const buckets = ['vip', '2odds', '5odds', 'big10'];
        const bucketCounts = {};
        for (const bucket of buckets) {
            const count = await Match.countDocuments({
                status: 'scheduled',
                prediction: { $exists: true },
                'prediction.bucket': bucket
            }).populate('prediction');
            const matches = await Match.find({ status: 'scheduled' })
                .populate({
                    path: 'prediction',
                    match: { bucket: bucket }
                });
            bucketCounts[bucket] = matches.filter(m => m.prediction).length;
        }

        res.json({ upcomingMatches, recentResults, bucketCounts });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getPredictionsByBucket = async (req, res) => {
    try {
        const { bucket } = req.params;
        const matches = await Match.find({ status: 'scheduled' })
            .populate({
                path: 'prediction',
                match: { bucket }
            })
            .populate('homeTeam awayTeam')
            .sort({ 'prediction.confidence': -1, matchDateUtc: 1 })
            .limit(20)
            .lean();

        const filteredMatches = matches.filter(m => m.prediction);
        res.json(filteredMatches);
    } catch (error) {
        console.error(`Error fetching predictions for bucket ${req.params.bucket}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getRecentResults = async (req, res) => {
    try {
        const matches = await Match.find({ status: 'finished' })
            .sort({ matchDateUtc: -1 })
            .limit(50)
            .populate('homeTeam awayTeam prediction')
            .lean();
        res.json(matches);
    } catch (error) {
        console.error("Error fetching recent results:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getMatchSummary = async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await Match.findById(matchId)
            .populate('prediction homeTeam awayTeam')
            .lean();

        if (!match || !match.prediction) {
            return res.status(404).json({ error: "Prediction not found for this match." });
        }
        if (!match.homeTeam || !match.awayTeam) {
            return res.status(404).json({ error: 'Could not load team details for summary.' });
        }

        const summary = await getSummaryFromAI(match);
        res.json({ summary });
    } catch (error) {
        console.error("Failed to fetch match summary", error);
        res.status(500).json({ error: `Could not load AI summary. ${error.message}` });
    }
};


// --- CRON JOB CONTROLLER ---

exports.runAllCronJobs = async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        console.log('CRON: Starting all jobs...');
        
        console.log('CRON: Fetching new matches...');
        const fetchResult = await fetchAndStoreMatches();
        console.log(`CRON: Fetching complete. New: ${fetchResult.newMatchesCount}, History: ${fetchResult.newHistoryCount}`);
        
        console.log('CRON: Generating new predictions...');
        const predictionResult = await generateAllPredictions();
        console.log(`CRON: Prediction generation complete. Processed: ${predictionResult.processedCount}`);

        console.log('CRON: Fetching match results...');
        const resultsResult = await fetchAndStoreResults();
        console.log(`CRON: Results fetching complete. Updated: ${resultsResult.updatedCount}`);

        console.log('CRON: All jobs finished successfully.');
        res.status(200).json({
            success: true,
            fetchResult,
            predictionResult,
            resultsResult
        });

    } catch (error) {
        console.error("A cron job failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
