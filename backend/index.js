
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');
const { runAllCronJobs } = require('./controllers/dataController');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable');
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// --- Cron Job Trigger Route ---
// This must be defined BEFORE the general '/api' router to avoid being overridden.
app.get('/api/cron/trigger-all', runAllCronJobs);

// --- API Routes ---
app.use('/api', apiRoutes);

// --- Root Endpoint for Health Checks ---
app.get('/', (req, res) => {
  res.send('GoalGazer Backend is running!');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
