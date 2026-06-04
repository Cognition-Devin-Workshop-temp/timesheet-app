"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { use } from "react";

const CALL_STATUSES = [
  "Not Called",
  "Will attend the session",
  "Didn't lift the call",
  "Will attend next session",
  "Out of city",
  "Will not attend session",
  "Number is busy",
  "Cut the call",
];

interface Attendee {
  _id: string;
  name: string;
  phone_number: string;
  age?: number;
  location?: string;
  about?: string;
  mentor_id?: string;
  comments: { text: string; created_at: string }[];
}

interface CallingRecord {
  attendee_id: string;
  call_status: string;
  session_comment: string;
}

interface SessionData {
  _id: string;
  session_name: string;
  session_date: string;
  calling_records: CallingRecord[];
}

interface Mentor {
  _id: string;
  name: string;
  phone_number: string;
  email?: string;
}

function statusColor(status: string): string {
  switch (status) {
    case "Will attend the session":
      return "bg-green-100 text-green-800 border-green-200";
    case "Didn't lift the call":
    case "Number is busy":
    case "Cut the call":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Will not attend session":
    case "Out of city":
      return "bg-red-100 text-red-800 border-red-200";
    case "Will attend next session":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export default function CallingPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = use(params);
  const [session, setSession] = useState<SessionData | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMentor, setSelectedMentor] = useState<string>("all");
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
          setMentors(data.mentors || []);
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

  const filteredAttendees =
    selectedMentor === "all"
      ? attendees
      : attendees.filter((a) => a.mentor_id === selectedMentor);

  function getCallingRecord(attendeeId: string): CallingRecord | undefined {
    return session?.calling_records.find((r) => r.attendee_id === attendeeId);
  }

  async function updateCallStatus(attendeeId: string, call_status: string) {
    await fetch(`/api/batches/${id}/sessions/${sessionId}/calling`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_id: attendeeId, call_status }),
    });
    setRefreshKey((k) => k + 1);
  }

  async function addComment(attendeeId: string) {
    const comment = commentInputs[attendeeId]?.trim();
    if (!comment) return;

    await fetch(`/api/batches/${id}/sessions/${sessionId}/calling`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_id: attendeeId, session_comment: comment }),
    });

    setCommentInputs({ ...commentInputs, [attendeeId]: "" });
    setRefreshKey((k) => k + 1);
  }

  async function copyNumber(phone: string, attendeeId: string) {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(attendeeId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  }

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

  const relevantRecords = session?.calling_records.filter((r) =>
    filteredAttendees.some((a) => a._id === r.attendee_id)
  ) ?? [];
  const calledCount = relevantRecords.filter((r) => r.call_status !== "Not Called").length;
  const willAttendCount = relevantRecords.filter((r) => r.call_status === "Will attend the session").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <Link
            href={`/batches/${id}/sessions/${sessionId}`}
            className="text-sm text-sage hover:text-saffron transition-colors"
          >
            ← Back to Attendance
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-deep-blue">Calling List</h1>
          <p className="text-sage text-sm mt-1">
            {session?.session_name} •{" "}
            {session && new Date(session.session_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>

        {/* Mentor Filter */}
        {mentors.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-sage mb-1.5">Filter by Mentor</label>
            <select
              value={selectedMentor}
              onChange={(e) => setSelectedMentor(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-deep-blue/20 text-sm font-medium text-deep-blue bg-white focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
            >
              <option value="all">All Attendees ({attendees.length})</option>
              {mentors.map((m) => {
                const count = attendees.filter((a) => a.mentor_id === m._id).length;
                return (
                  <option key={m._id} value={m._id}>
                    {m.name}&apos;s List ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-saffron/10 p-3 text-center">
            <p className="text-xl font-bold text-deep-blue">{filteredAttendees.length}</p>
            <p className="text-xs text-sage">Total</p>
          </div>
          <div className="bg-white rounded-xl border border-saffron/10 p-3 text-center">
            <p className="text-xl font-bold text-saffron">{calledCount}</p>
            <p className="text-xs text-sage">Called</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{willAttendCount}</p>
            <p className="text-xs text-sage">Confirmed</p>
          </div>
        </div>

        {/* Calling Cards */}
        <div className="space-y-4">
          {filteredAttendees.map((a) => {
            const record = getCallingRecord(a._id);
            const currentStatus = record?.call_status || "Not Called";

            return (
              <div key={a._id} className="bg-white rounded-2xl shadow-sm border border-saffron/10 overflow-hidden">
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-deep-blue text-base">{a.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {a.age && <span className="text-xs text-sage bg-cream px-2 py-0.5 rounded-full">{a.age}y</span>}
                        {a.location && <span className="text-xs text-sage bg-cream px-2 py-0.5 rounded-full">{a.location}</span>}
                        <span className="text-xs bg-deep-blue/5 text-deep-blue px-2 py-0.5 rounded-full font-medium">
                          {attendanceCounts[a._id] || 0} sessions attended
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={`tel:${a.phone_number}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors text-sm"
                    >
                      Call {a.phone_number}
                    </a>
                    <button
                      onClick={() => copyNumber(a.phone_number, a._id)}
                      className="px-3 py-2.5 bg-cream hover:bg-saffron/10 rounded-xl transition-colors text-sm border border-saffron/10"
                      title="Copy number"
                    >
                      {copiedId === a._id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="px-4 pb-3">
                  <label className="block text-xs font-medium text-sage mb-1.5">Call Status</label>
                  <select
                    value={currentStatus}
                    onChange={(e) => updateCallStatus(a._id, e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${statusColor(currentStatus)}`}
                  >
                    {CALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="px-4 pb-4">
                  <label className="block text-xs font-medium text-sage mb-1.5">Quick Note</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentInputs[a._id] || ""}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [a._id]: e.target.value })}
                      placeholder="Add a note about this call..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all text-sm bg-cream/30"
                      onKeyDown={(e) => { if (e.key === "Enter") addComment(a._id); }}
                    />
                    <button
                      onClick={() => addComment(a._id)}
                      className="px-3 py-2 bg-saffron/10 text-saffron hover:bg-saffron/20 rounded-xl transition-colors text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>

                  {record?.session_comment && (
                    <p className="mt-2 text-xs text-sage italic bg-cream/50 px-3 py-1.5 rounded-lg">
                      Latest: {record.session_comment}
                    </p>
                  )}

                  {a.comments && a.comments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-sage">History:</p>
                      {a.comments.slice(-3).reverse().map((c, i) => (
                        <p key={i} className="text-xs text-sage/70 pl-2">
                          {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {c.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredAttendees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-saffron/10">
            <p className="text-sage">
              {mentors.length > 0 && selectedMentor !== "all"
                ? "No attendees assigned to this mentor."
                : "No attendees in this batch. Add attendees first."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
