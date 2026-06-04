import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBatch extends Document {
  batch_name: string;
  created_at: Date;
}

const BatchSchema = new Schema<IBatch>({
  batch_name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema);
