
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPrediction extends Document {
  _id: Types.ObjectId;
  matchId: Types.ObjectId;
  version: string;
  features: {
    teamFormWeight: number;
    h2hWeight: number;
    homeAdvWeight: number;
    goalsWeight: number;
    injuriesWeight?: number;
  };
  outcomes: {
    oneXTwo: { home: number; draw: number; away: number };
    doubleChance: { homeOrDraw: number; homeOrAway: number; drawOrAway: number };
    over05: number;
    over15: number;
    over25: number;
    bttsYes: number;
    bttsNo: number;
    correctScoreRange: string;
    halfTimeDraw: number;
  };
  confidence: number;
  bucket: '2odds' | '5odds' | 'vip' | 'big10';
  createdAt: Date;
  updatedAt: Date;
}

const PredictionSchema = new Schema<IPrediction>({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  version: { type: String, required: true },
  features: {
    teamFormWeight: { type: Number, required: true },
    h2hWeight: { type: Number, required: true },
    homeAdvWeight: { type: Number, required: true },
    goalsWeight: { type: Number, required: true },
    injuriesWeight: Number,
  },
  outcomes: {
    oneXTwo: {
      home: { type: Number, required: true },
      draw: { type: Number, required: true },
      away: { type: Number, required: true },
    },
    doubleChance: {
      homeOrDraw: { type: Number, required: true },
      homeOrAway: { type: Number, required: true },
      drawOrAway: { type: Number, required: true },
    },
    over05: { type: Number, required: true },
    over15: { type: Number, required: true },
    over25: { type: Number, required: true },
    bttsYes: { type: Number, required: true },
    bttsNo: { type: Number, required: true },
    correctScoreRange: { type: String, required: true },
    halfTimeDraw: { type: Number, required: true },
  },
  confidence: { type: Number, required: true },
  bucket: { type: String, enum: ['2odds', '5odds', 'vip', 'big10'], required: true },
}, { timestamps: true });

PredictionSchema.index({ matchId: 1 }, { unique: true });

export default mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', PredictionSchema);
