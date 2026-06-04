import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Batch } from "@/models/Batch";

export async function GET() {
  await connectDB();
  const batches = await Batch.find().sort({ created_at: -1 });
  return NextResponse.json(batches);
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const { batch_name } = await request.json();

    if (!batch_name) {
      return NextResponse.json(
        { error: "Batch name is required" },
        { status: 400 }
      );
    }

    const batch = await Batch.create({ batch_name });
    return NextResponse.json(batch, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}
