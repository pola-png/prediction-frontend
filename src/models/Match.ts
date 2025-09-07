
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Match as MatchType } from '@/lib/types';

const MatchSchema = new Schema<MatchType>({
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

const Match = (models.Match as Model<MatchType>) || mongoose.model<MatchType>('Match', MatchSchema);
export default Match;
