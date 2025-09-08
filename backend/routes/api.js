
const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// --- Frontend Data Routes ---
router.get('/dashboard', dataController.getDashboardData);
router.get('/predictions/:bucket', dataController.getPredictionsByBucket);
router.get('/results', dataController.getRecentResults);
router.get('/summary/:matchId', dataController.getMatchSummary);

// --- Cron Job Triggers ---
// This route has been moved to index.js for explicit handling.

module.exports = router;
