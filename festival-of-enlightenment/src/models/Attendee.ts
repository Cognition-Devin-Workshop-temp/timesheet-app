import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IComment {
  text: string;
  created_at: Date;
}

export interface IAttendee extends Document {
  batch_id: Types.ObjectId;
  name: string;
  amount_paid: number;
  phone_number: string;
  age?: number;
  about?: string;
  location?: string;
  comments: IComment[];
}

const CommentSchema = new Schema<IComment>({
  text: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const AttendeeSchema = new Schema<IAttendee>({
  batch_id: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
  name: { type: String, required: true },
  amount_paid: { type: Number, required: true },
  phone_number: { type: String, required: true },
  age: { type: Number },
  about: { type: String },
  location: { type: String },
  comments: [CommentSchema],
});

export const Attendee: Model<IAttendee> =
  mongoose.models.Attendee || mongoose.model<IAttendee>("Attendee", AttendeeSchema);
