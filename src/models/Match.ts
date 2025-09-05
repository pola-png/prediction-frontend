
import mongoose, { Document, Schema, Types } from 'mongoose';
import type { ITeam } from './Team';
import type { IPrediction } from './Prediction';

export interface IMatch extends Document {
  _id: Types.ObjectId;
  source: 'footballjson' | 'openligadb' | 'openfootball';
  externalId: string;
  leagueCode: string;
  season: string;
  matchDateUtc: Date;
  status: 'scheduled' | 'in-progress' | 'finished' | 'postponed' | 'canceled';
  homeTeam: Types.ObjectId | ITeam;
  awayTeam: Types.ObjectId | ITeam;
  homeGoals?: number;
  awayGoals?: number;
  tags?: ('2odds' | '5odds' | 'vip' | 'big10')[];
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  prediction?: Types.ObjectId | IPrediction;
}

const MatchSchema = new Schema<IMatch>({
  source: { type: String, enum: ['footballjson', 'openligadb', 'openfootball'], required: true },
  externalId: { type: String, required: true },
  leagueCode: { type: String, required: true },
  season: { type: String, required: true },
  matchDateUtc: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'in-progress', 'finished', 'postponed', 'canceled'], required: true },
  homeTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  awayTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  homeGoals: Number,
  awayGoals: Number,
  tags: [{ type: String, enum: ['2odds', '5odds', 'vip', 'big10'] }],
  lastUpdatedAt: { type: Date, default: Date.now },
  prediction: { type: Schema.Types.ObjectId, ref: 'Prediction' }
}, { timestamps: true });

MatchSchema.index({ source: 1, externalId: 1 }, { unique: true });
MatchSchema.index({ matchDateUtc: -1, leagueCode: 1, status: 1 });

export default mongoose.models.Match || mongoose.model<IMatch>('Match', MatchSchema);
