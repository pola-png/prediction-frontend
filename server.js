
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI environment variable is not defined.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
.then(() => console.log('DB: Successfully connected to MongoDB.'))
.catch(err => {
  console.error('FATAL ERROR: Database connection failed.', err);
  process.exit(1);
});

mongoose.connection.on('error', err => {
  console.error('DB: MongoDB runtime error:', err);
});

// --- API Routes ---
app.use('/api', apiRoutes);

// --- Root Endpoint for Health Checks ---
app.get('/', (req, res) => {
  res.status(200).send('GoalGazer Backend is running!');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`SERVER: Running on port ${PORT}`);
});
