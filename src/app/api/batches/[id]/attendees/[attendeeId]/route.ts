import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Attendee } from "@/models/Attendee";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; attendeeId: string }> }
) {
  const { attendeeId } = await params;
  try {
    await connectDB();
    const body = await request.json();

    const attendee = await Attendee.findByIdAndUpdate(attendeeId, body, {
      new: true,
    });

    if (!attendee) {
      return NextResponse.json(
        { error: "Attendee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(attendee);
  } catch {
    return NextResponse.json(
      { error: "Failed to update attendee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attendeeId: string }> }
) {
  const { attendeeId } = await params;
  await connectDB();
  await Attendee.findByIdAndDelete(attendeeId);
  return NextResponse.json({ success: true });
}
