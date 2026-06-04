import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Attendee } from "@/models/Attendee";
import { Mentor } from "@/models/Mentor";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const attendees = await Attendee.find({ batch_id: id });
  return NextResponse.json(attendees);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();
    const body = await request.json();

    if (!body.name || body.amount_paid === undefined || !body.phone_number) {
      return NextResponse.json(
        { error: "Name, amount paid, and phone number are required" },
        { status: 400 }
      );
    }

    // Find mentor with fewest attendees for auto-assignment
    const mentors = await Mentor.find({ batch_id: id }).sort({ created_at: 1 });
    let assignedMentorId = undefined;
    if (mentors.length > 0) {
      const counts = await Attendee.aggregate([
        { $match: { batch_id: (await import("mongoose")).Types.ObjectId.createFromHexString(id), mentor_id: { $exists: true } } },
        { $group: { _id: "$mentor_id", count: { $sum: 1 } } },
      ]);
      const countMap: Record<string, number> = {};
      for (const c of counts) {
        countMap[c._id.toString()] = c.count;
      }
      let minCount = Infinity;
      for (const m of mentors) {
        const cnt = countMap[m._id.toString()] || 0;
        if (cnt < minCount) {
          minCount = cnt;
          assignedMentorId = m._id;
        }
      }
    }

    const attendee = await Attendee.create({
      batch_id: id,
      mentor_id: assignedMentorId,
      name: body.name,
      amount_paid: body.amount_paid,
      phone_number: body.phone_number,
      age: body.age,
      about: body.about,
      location: body.location,
    });

    return NextResponse.json(attendee, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create attendee" },
      { status: 500 }
    );
  }
}
