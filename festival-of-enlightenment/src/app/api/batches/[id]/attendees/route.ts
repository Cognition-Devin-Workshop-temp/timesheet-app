import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Attendee } from "@/models/Attendee";

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

    const attendee = await Attendee.create({
      batch_id: id,
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
