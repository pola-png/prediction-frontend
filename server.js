
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
  console.error('FATAL ERROR: MONGO_URI environment variable is not defined.');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => console.log('Successfully connected to MongoDB.'))
.catch(err => {
  console.error('FATAL ERROR: Database connection failed.', err);
  process.exit(1);
});

mongoose.connection.on('error', err => {
  console.error('MongoDB runtime error:', err);
});

// --- API Routes ---
app.use('/api', apiRoutes);
console.log('API routes loaded successfully.');

// --- Root Endpoint for Health Checks ---
app.get('/', (req, res) => {
  res.send('GoalGazer Backend is running!');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
