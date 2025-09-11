import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  id: Number,
  name: String,
  shortName: String,
  tla: String,
  crest: String,
}, { _id: false });

const scoreSchema = new mongoose.Schema({
  winner: String,
  duration: String,
  fullTime: {
    home: Number,
    away: Number,
  },
  halfTime: {
    home: Number,
    away: Number,
  },
}, { _id: false });

const matchSchema = new mongoose.Schema({
  area: {
    id: Number,
    name: String,
    code: String,
    flag: String,
  },
  competition: {
    id: Number,
    name: String,
    code: String,
    type: String,
    emblem: String,
  },
  season: {
    id: Number,
    startDate: String,
    endDate: String,
    currentMatchday: Number,
    winner: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  id: { type: Number, unique: true, required: true },
  utcDate: Date,
  status: String,
  matchday: Number,
  stage: String,
  group: { type: String, default: null },
  lastUpdated: Date,
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: scoreSchema,
  odds: {
    msg: String,
  },
  referees: [{
    id: Number,
    name: String,
    type: String,
    nationality: String,
  }],
});

const Match = mongoose.model('Match', matchSchema);

export default Match;
