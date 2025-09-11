const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// --- Frontend Data Routes ---
router.get('/dashboard', dataController.getDashboardData);
router.get('/predictions/:bucket', dataController.getPredictionsByBucket);
router.get('/results', dataController.getRecentResults);
router.get('/summary/:matchId', dataController.getMatchSummary);

// --- Cron Job Triggers ---
// NOTE: Render Cron Jobs use 'Authorization: Bearer <token>' header
router.post('/cron/fetch-matches', dataController.runFetchMatches);
router.post('/cron/run-predictions', dataController.runGeneratePredictions);
router.post('/cron/fetch-results', dataController.runFetchResults);


module.exports = router;
