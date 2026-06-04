import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { Attendee } from "@/models/Attendee";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    await connectDB();
    const { attendee_id, call_status, session_comment } = await request.json();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const record = session.calling_records.find(
      (r) => r.attendee_id.toString() === attendee_id
    );

    if (record) {
      if (call_status !== undefined) record.call_status = call_status;
      if (session_comment !== undefined)
        record.session_comment = session_comment;
    } else {
      session.calling_records.push({
        attendee_id,
        call_status: call_status || "Not Called",
        session_comment: session_comment || "",
      });
    }

    if (session_comment) {
      await Attendee.findByIdAndUpdate(attendee_id, {
        $push: {
          comments: {
            text: session_comment,
            created_at: new Date(),
          },
        },
      });
    }

    await session.save();
    return NextResponse.json(session);
  } catch {
    return NextResponse.json(
      { error: "Failed to update calling record" },
      { status: 500 }
    );
  }
}
