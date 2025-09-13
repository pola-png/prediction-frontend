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

// --- Database Connection (non-blocking) ---
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('DB: Successfully connected to MongoDB.'))
    .catch(err => console.error('DB: Initial connection failed.', err));

  mongoose.connection.on('error', err => {
    console.error('DB: MongoDB runtime error:', err);
  });
} else {
  console.warn('Warning: MONGO_URI is not defined. Skipping DB connection.');
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

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 SERVER: Running on port ${PORT}`);
  console.log(`✅ Health check endpoints available at "/" and "/healthz"`);
});