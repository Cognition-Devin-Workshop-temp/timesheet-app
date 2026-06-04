"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { use } from "react";

interface Attendee {
  _id: string;
  name: string;
  phone_number: string;
  location?: string;
}

interface AttendanceRecord {
  attendee_id: string;
  status: boolean;
}

interface SessionData {
  _id: string;
  session_name: string;
  session_date: string;
  attendance_records: AttendanceRecord[];
}

export default function AttendancePage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = use(params);
  const [session, setSession] = useState<SessionData | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/batches/${id}/sessions/${sessionId}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setSession(data.session);
          setAttendees(data.attendees);
          setAttendanceCounts(data.attendanceCounts || {});
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, sessionId, refreshKey, router]);

  async function toggleAttendance(attendeeId: string, currentStatus: boolean) {
    await fetch(`/api/batches/${id}/sessions/${sessionId}/attendance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendee_id: attendeeId,
        status: !currentStatus,
      }),
    });
    setRefreshKey((k) => k + 1);
  }

  function getAttendanceStatus(attendeeId: string): boolean {
    const record = session?.attendance_records.find(
      (r) => r.attendee_id === attendeeId
    );
    return record?.status ?? false;
  }

  const presentCount =
    session?.attendance_records.filter((r) => r.status).length ?? 0;
  const totalCount = attendees.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="inline-block w-8 h-8 border-4 border-saffron/30 border-t-saffron rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/batches/${id}`}
            className="text-sm text-sage hover:text-saffron transition-colors"
          >
            ← Back to Batch
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-deep-blue">
            {session?.session_name}
          </h1>
          <p className="text-sage text-sm mt-1">
            {session &&
              new Date(session.session_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
          </p>
        </div>

        {/* Stats Banner */}
        <div className="bg-white rounded-2xl shadow-md border border-saffron/10 p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-sage">Attendance</p>
            <p className="text-2xl font-bold text-deep-blue">
              {presentCount}{" "}
              <span className="text-base font-normal text-sage">
                / {totalCount}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-sage">Present</p>
            <p className="text-2xl font-bold text-saffron">
              {totalCount > 0
                ? Math.round((presentCount / totalCount) * 100)
                : 0}
              %
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/batches/${id}/sessions/${sessionId}/calling`}
            className="text-sm px-4 py-2 bg-saffron/10 text-saffron hover:bg-saffron/20 rounded-lg transition-colors font-medium"
          >
            Open Calling List
          </Link>
        </div>

        {/* Attendance List */}
        <div className="space-y-2">
          {attendees.map((a) => {
            const isPresent = getAttendanceStatus(a._id);
            return (
              <div
                key={a._id}
                className={`bg-white rounded-xl border p-4 flex items-center justify-between transition-all ${
                  isPresent
                    ? "border-green-200 bg-green-50/30"
                    : "border-saffron/10"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-deep-blue">{a.name}</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    {a.location && (
                      <span className="text-xs text-sage">{a.location}</span>
                    )}
                    <span className="text-xs text-sage">
                      Total attended:{" "}
                      {attendanceCounts[a._id] || 0}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleAttendance(a._id, isPresent)}
                  className={`w-14 h-8 rounded-full relative transition-all duration-200 ${
                    isPresent ? "bg-green-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-200 ${
                      isPresent ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {attendees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-saffron/10">
            <p className="text-sage">
              No attendees in this batch. Add attendees first.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
