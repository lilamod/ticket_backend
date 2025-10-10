import mongoose, { Document, Schema } from 'mongoose';

interface Project extends Document {
    name: string;
}

const projectSchema: Schema<Project> = new Schema(
    {
        name : {
            type: String,
            required: true
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<Project>('Project', projectSchema);
