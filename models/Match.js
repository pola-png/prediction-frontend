
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MatchSchema = new Schema({
    source: String,
    externalId: { type: String, unique: true, sparse: true },
    leagueCode: { type: String, required: true },
    matchDateUtc: { type: Date, required: true },
    status: { type: String, required: true },
    homeTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    awayTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    homeGoals: Number,
    awayGoals: Number,
    tags: [String],
    prediction: { type: Schema.Types.ObjectId, ref: 'Prediction' },
}, { timestamps: true });

module.exports = mongoose.model('Match', MatchSchema);
