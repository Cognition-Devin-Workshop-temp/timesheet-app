import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Mentor } from "@/models/Mentor";
import { Attendee } from "@/models/Attendee";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const mentors = await Mentor.find({ batch_id: id }).sort({ created_at: 1 });
  return NextResponse.json(mentors);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();

  const mentor = await Mentor.create({
    batch_id: id,
    name: body.name,
    phone_number: body.phone_number,
    email: body.email || undefined,
  });

  // Auto-assign: redistribute all attendees equally among all mentors
  await redistributeAttendees(id);

  return NextResponse.json(mentor, { status: 201 });
}

async function redistributeAttendees(batchId: string) {
  const mentors = await Mentor.find({ batch_id: batchId }).sort({ created_at: 1 });
  if (mentors.length === 0) {
    // No mentors — clear all assignments
    await Attendee.updateMany({ batch_id: batchId }, { $unset: { mentor_id: "" } });
    return;
  }

  const attendees = await Attendee.find({ batch_id: batchId }).sort({ _id: 1 });

  const bulkOps = attendees.map((attendee, index) => ({
    updateOne: {
      filter: { _id: attendee._id },
      update: { $set: { mentor_id: mentors[index % mentors.length]._id } },
    },
  }));

  if (bulkOps.length > 0) {
    await Attendee.bulkWrite(bulkOps);
  }
}
