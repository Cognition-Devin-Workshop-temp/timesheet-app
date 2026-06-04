import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Batch } from "@/models/Batch";
import { Attendee } from "@/models/Attendee";
import { Session } from "@/models/Session";
import { Mentor } from "@/models/Mentor";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  const batch = await Batch.findById(id);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const attendees = await Attendee.find({ batch_id: id });
  const sessions = await Session.find({ batch_id: id }).sort({
    session_date: -1,
  });
  const mentors = await Mentor.find({ batch_id: id }).sort({ created_at: 1 });

  return NextResponse.json({ batch, attendees, sessions, mentors });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  await Attendee.deleteMany({ batch_id: id });
  await Session.deleteMany({ batch_id: id });
  await Mentor.deleteMany({ batch_id: id });
  await Batch.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
