import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IHistory extends Document {
    _id: Types.ObjectId;
    matchId: Types.ObjectId;
    predictionId: Types.ObjectId;
    resolvedAt?: Date;
    result: {
        homeGoals?: number;
        awayGoals?: number;
        outcome?: 'home'|'draw'|'away';
        over15?: boolean;
        over25?: boolean;
        bttsYes?: boolean;
        correctScoreBucket?: string;
    };
    correctness: {
        oneXTwo?: boolean;
        over15?: boolean;
        over25?: boolean;
        bttsYes?: boolean;
        correctScoreRange?: boolean;
    };
    createdAt: Date;
}

const HistorySchema = new Schema<IHistory>({
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    predictionId: { type: Schema.Types.ObjectId, ref: 'Prediction', required: true },
    resolvedAt: Date,
    result: {
        homeGoals: Number,
        awayGoals: Number,
        outcome: { type: String, enum: ['home', 'draw', 'away'] },
        over15: Boolean,
        over25: Boolean,
        bttsYes: Boolean,
        correctScoreBucket: String,
    },
    correctness: {
        oneXTwo: Boolean,
        over15: Boolean,
        over25: Boolean,
        bttsYes: Boolean,
        correctScoreRange: Boolean,
    }
}, { timestamps: true });

HistorySchema.index({ matchId: 1, predictionId: 1 });

const History = mongoose.models.History || mongoose.model<IHistory>('History', HistorySchema);

export default History;
