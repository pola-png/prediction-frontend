const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.send('GoalGazer API is running!');
});

// Connect to MongoDB and start server
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined.");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Could not connect to MongoDB...', err);
        process.exit(1);
    });
