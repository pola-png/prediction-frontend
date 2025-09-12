require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Please define the MONGO_URI environment variable in your .env file');
  // process.exit(1); // Commenting out to allow startup for initial checks
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch(err => {
      console.error('Database connection error:', err);
      process.exit(1);
    });
}


// --- API Routes ---
app.use('/api', apiRoutes);

// --- Root Endpoint for Health Checks ---
app.get('/', (req, res) => {
  res.send('GoalGazer Backend is running!');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
