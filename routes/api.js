
const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// --- Frontend Data Routes ---
router.get('/dashboard', dataController.getDashboardData);
router.get('/predictions/:bucket', dataController.getPredictionsByBucket);
router.get('/results', dataController.getRecentResults);
router.get('/summary/:matchId', dataController.getMatchSummary);

// --- Cron Job Triggers ---
router.get('/cron/fetch-matches', dataController.runFetchMatches);
router.get('/cron/run-predictions', dataController.runGeneratePredictions);
router.get('/cron/fetch-results', dataController.runFetchResults);


module.exports = router;
