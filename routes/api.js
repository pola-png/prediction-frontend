const express = require('express');
const router = express.Router();

// Middleware to check for a secret token in the query string
// This is a simple form of protection for our cron job endpoints
const checkCronToken = (req, res, next) => {
  const token = req.query.token;
  if (!token || token !== process.env.CRON_TOKEN) {
    return res.status(403).json({ message: 'Forbidden: Invalid or missing token.' });
  }
  next();
};

// Define the cron job routes
router.get('/cron/fetch-matches', checkCronToken, (req, res) => {
  console.log('Endpoint /cron/fetch-matches was called successfully.');
  // In a real application, you would trigger the match fetching service here.
  res.status(200).json({ message: 'Request to fetch matches received. Job is running.' });
});

router.get('/cron/run-predictions', checkCronToken, (req, res) => {
  console.log('Endpoint /cron/run-predictions was called successfully.');
  // In a real application, you would trigger the prediction service here.
  res.status(200).json({ message: 'Request to run predictions received. Job is running.' });
});

router.get('/cron/fetch-results', checkCronToken, (req, res) => {
  console.log('Endpoint /cron/fetch-results was called successfully.');
  // In a real application, you would trigger the results fetching service here.
  res.status(200).json({ message: 'Request to fetch results received. Job is running.' });
});

module.exports = router;
