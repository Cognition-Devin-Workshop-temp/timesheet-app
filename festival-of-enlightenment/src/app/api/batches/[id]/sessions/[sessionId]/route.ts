import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { Attendee } from "@/models/Attendee";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  await connectDB();

  const session = await Session.findById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const attendees = await Attendee.find({ batch_id: id });

  const allSessions = await Session.find({ batch_id: id });
  const attendanceCounts: Record<string, number> = {};
  for (const s of allSessions) {
    for (const rec of s.attendance_records) {
      if (rec.status) {
        const aid = rec.attendee_id.toString();
        attendanceCounts[aid] = (attendanceCounts[aid] || 0) + 1;
      }
    }
  }

  return NextResponse.json({ session, attendees, attendanceCounts });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { sessionId } = await params;
  await connectDB();
  await Session.findByIdAndDelete(sessionId);
  return NextResponse.json({ success: true });
}
