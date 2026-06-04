import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Mentor } from "@/models/Mentor";
import { Attendee } from "@/models/Attendee";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mentorId: string }> }
) {
  const { id, mentorId } = await params;
  await connectDB();

  await Mentor.findByIdAndDelete(mentorId);

  // Redistribute remaining attendees among remaining mentors
  const mentors = await Mentor.find({ batch_id: id }).sort({ created_at: 1 });
  if (mentors.length === 0) {
    await Attendee.updateMany({ batch_id: id }, { $unset: { mentor_id: "" } });
  } else {
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
  }

  return NextResponse.json({ success: true });
}
