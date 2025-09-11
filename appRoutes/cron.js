
import { Router } from 'express';

const router = Router();

// Middleware to protect cron routes
const checkCronToken = (req, res, next) => {
  const { token } = req.query;
  if (!process.env.CRON_TOKEN || token === process.env.CRON_TOKEN) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

router.get('/fetch-matches', checkCronToken, async (req, res) => {
    // This is a placeholder for the real fetch logic.
    // In a real application, you would call your service functions here
    // to fetch data from external APIs and update the database.
    console.log('Cron job: Fetching matches...');
    res.status(200).json({ message: 'Cron job for fetching matches executed successfully.' });
});

router.get('/update-scores', checkCronToken, async (req, res) => {
    // This is a placeholder for the real update logic.
    console.log('Cron job: Updating scores...');
    res.status(200).json({ message: 'Cron job for updating scores executed successfully.' });
});

export default router;
