
const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// --- Frontend Data Routes ---
router.get('/dashboard', dataController.getDashboardData);
router.get('/predictions/:bucket', dataController.getPredictionsByBucket);
router.get('/results', dataController.getRecentResults);
router.get('/summary/:matchId', dataController.getMatchSummary);

// --- Cron Job Triggers ---
router.get('/cron/trigger-all', dataController.runAllCronJobs);

module.exports = router;
