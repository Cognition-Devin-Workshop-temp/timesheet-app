import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Mentor } from "@/models/Mentor";
import { Attendee } from "@/models/Attendee";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  const mentors = await Mentor.find({ batch_id: id }).sort({ created_at: 1 });
  if (mentors.length === 0) {
    await Attendee.updateMany({ batch_id: id }, { $unset: { mentor_id: "" } });
    return NextResponse.json({ success: true, message: "No mentors — cleared all assignments" });
  }

  const attendees = await Attendee.find({ batch_id: id }).sort({ _id: 1 });
  const bulkOps = attendees.map((attendee, index) => ({
    updateOne: {
      filter: { _id: attendee._id },
      update: { $set: { mentor_id: mentors[index % mentors.length]._id } },
    },
  }));

  if (bulkOps.length > 0) {
    await Attendee.bulkWrite(bulkOps);
  }

  return NextResponse.json({ success: true, message: `Redistributed ${attendees.length} attendees among ${mentors.length} mentors` });
}
