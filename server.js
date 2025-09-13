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

// --- Start server immediately ---
app.listen(PORT, () => {
  console.log(`🚀 SERVER: Running on port ${PORT}, health check at /healthz`);
  connectToMongo(); // connect DB in background
});

// --- Database Connection (non-blocking) ---
const MONGO_URI = process.env.MONGO_URI;
async function connectToMongo() {
  if (!MONGO_URI) {
    console.warn('⚠️ Warning: MONGO_URI not defined. Skipping DB connection.');
    return;
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ DB: Successfully connected to MongoDB.');
  } catch (err) {
    console.error('❌ DB: Initial connection failed:', err);
  }

  mongoose.connection.on('error', (err) => {
    console.error('❌ DB: MongoDB runtime error:', err);
  });
}

// --- API Routes ---
app.use('/api', apiRoutes);

// --- Health Check Endpoint ---
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Root Endpoint ---
app.get('/', (req, res) => {
  res.status(200).send('GoalGazer Backend is running!');
});
