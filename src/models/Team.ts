import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  logoUrl: string;
}

const TeamSchema = new Schema<ITeam>({
  name: { type: String, required: true, unique: true },
  logoUrl: { type: String, required: true },
}, { timestamps: true });

const Team = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);

export default Team;
