import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAttendanceRecord {
  attendee_id: Types.ObjectId;
  status: boolean;
}

export interface ICallingRecord {
  attendee_id: Types.ObjectId;
  call_status: string;
  session_comment: string;
}

export interface ISession extends Document {
  batch_id: Types.ObjectId;
  session_name: string;
  session_date: Date;
  attendance_records: IAttendanceRecord[];
  calling_records: ICallingRecord[];
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>({
  attendee_id: { type: Schema.Types.ObjectId, ref: "Attendee", required: true },
  status: { type: Boolean, default: false },
});

const CallingRecordSchema = new Schema<ICallingRecord>({
  attendee_id: { type: Schema.Types.ObjectId, ref: "Attendee", required: true },
  call_status: {
    type: String,
    enum: [
      "Not Called",
      "Will attend the session",
      "Didn't lift the call",
      "Will attend next session",
      "Out of city",
      "Will not attend session",
      "Number is busy",
      "Cut the call",
    ],
    default: "Not Called",
  },
  session_comment: { type: String, default: "" },
});

const SessionSchema = new Schema<ISession>({
  batch_id: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
  session_name: { type: String, required: true },
  session_date: { type: Date, required: true },
  attendance_records: [AttendanceRecordSchema],
  calling_records: [CallingRecordSchema],
});

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);
