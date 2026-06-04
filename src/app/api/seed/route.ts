import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Batch } from "@/models/Batch";
import { Attendee } from "@/models/Attendee";
import { Session } from "@/models/Session";
import { Mentor } from "@/models/Mentor";

export async function POST() {
  try {
    await connectDB();

    const batch = await Batch.create({
      batch_name: "January 2025 — Youth Awakening",
    });

    const attendeesData = [
      {
        name: "Arjun Sharma",
        amount_paid: 500,
        phone_number: "+919876543210",
        age: 24,
        location: "Mumbai",
        about: "Engineering student interested in Vedantic philosophy",
      },
      {
        name: "Priya Patel",
        amount_paid: 500,
        phone_number: "+919876543211",
        age: 22,
        location: "Pune",
        about: "Yoga practitioner and meditation enthusiast",
      },
      {
        name: "Rahul Verma",
        amount_paid: 300,
        phone_number: "+919876543212",
        age: 28,
        location: "Delhi",
        about: "Working professional seeking spiritual growth",
      },
      {
        name: "Sneha Reddy",
        amount_paid: 500,
        phone_number: "+919876543213",
        age: 20,
        location: "Hyderabad",
        about: "College student exploring Bhagavad Gita",
      },
      {
        name: "Vikram Singh",
        amount_paid: 400,
        phone_number: "+919876543214",
        age: 26,
        location: "Jaipur",
      },
    ];

    // Create mentors
    const mentorsData = [
      { name: "Swami Vivekananda Ji", phone_number: "+919800000001", email: "swami@example.com" },
      { name: "Guru Priya Ma", phone_number: "+919800000002", email: "priya.guru@example.com" },
    ];

    const mentors = await Mentor.insertMany(
      mentorsData.map((m) => ({ ...m, batch_id: batch._id }))
    );

    // Auto-assign attendees equally among mentors
    const attendees = await Attendee.insertMany(
      attendeesData.map((a, i) => ({
        ...a,
        batch_id: batch._id,
        mentor_id: mentors[i % mentors.length]._id,
      }))
    );

    await Session.create({
      batch_id: batch._id,
      session_name: "Saturday Youth Awakening — Week 1",
      session_date: new Date("2025-01-04"),
      attendance_records: attendees.map((a) => ({
        attendee_id: a._id,
        status: false,
      })),
      calling_records: attendees.map((a) => ({
        attendee_id: a._id,
        call_status: "Not Called",
        session_comment: "",
      })),
    });

    return NextResponse.json({ success: true, batchId: batch._id });
  } catch (err) {
    return NextResponse.json(
      { error: "Seed failed", details: String(err) },
      { status: 500 }
    );
  }
}
