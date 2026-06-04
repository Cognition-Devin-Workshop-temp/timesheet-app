import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    await connectDB();
    const { attendee_id, status } = await request.json();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const record = session.attendance_records.find(
      (r) => r.attendee_id.toString() === attendee_id
    );

    if (record) {
      record.status = status;
    } else {
      session.attendance_records.push({ attendee_id, status });
    }

    await session.save();
    return NextResponse.json(session);
  } catch {
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    );
  }
}
