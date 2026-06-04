import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMentor extends Document {
  batch_id: Types.ObjectId;
  name: string;
  phone_number: string;
  email?: string;
  created_at: Date;
}

const MentorSchema = new Schema<IMentor>({
  batch_id: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
  name: { type: String, required: true },
  phone_number: { type: String, required: true },
  email: { type: String },
  created_at: { type: Date, default: Date.now },
});

export const Mentor: Model<IMentor> =
  mongoose.models.Mentor || mongoose.model<IMentor>("Mentor", MentorSchema);
