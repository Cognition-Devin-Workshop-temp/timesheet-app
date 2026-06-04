import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { Attendee } from "@/models/Attendee";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const sessions = await Session.find({ batch_id: id }).sort({
    session_date: -1,
  });
  return NextResponse.json(sessions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();
    const { session_name, session_date } = await request.json();

    if (!session_name || !session_date) {
      return NextResponse.json(
        { error: "Session name and date are required" },
        { status: 400 }
      );
    }

    const attendees = await Attendee.find({ batch_id: id });

    const attendance_records = attendees.map((a) => ({
      attendee_id: a._id,
      status: false,
    }));

    const calling_records = attendees.map((a) => ({
      attendee_id: a._id,
      call_status: "Not Called",
      session_comment: "",
    }));

    const session = await Session.create({
      batch_id: id,
      session_name,
      session_date,
      attendance_records,
      calling_records,
    });

    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
