
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Team as TeamType } from '@/lib/types';

const TeamSchema = new Schema<TeamType>({
    name: { type: String, required: true, unique: true },
    logoUrl: String,
});

const Team = (models.Team as Model<TeamType>) || mongoose.model<TeamType>('Team', TeamSchema);
export default Team;
