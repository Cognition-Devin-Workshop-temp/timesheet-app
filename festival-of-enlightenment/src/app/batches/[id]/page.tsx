"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { use } from "react";

interface Attendee {
  _id: string;
  name: string;
  amount_paid: number;
  phone_number: string;
  age?: number;
  about?: string;
  location?: string;
}

interface Session {
  _id: string;
  session_name: string;
  session_date: string;
}

interface Batch {
  _id: string;
  batch_name: string;
  created_at: string;
}

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"attendees" | "sessions">(
    "attendees"
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    amount_paid: "",
    phone_number: "",
    age: "",
    about: "",
    location: "",
  });

  const [sessionForm, setSessionForm] = useState({
    session_name: "",
    session_date: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/batches/${id}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setBatch(data.batch);
          setAttendees(data.attendees);
          setSessions(data.sessions);
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, refreshKey, router]);

  async function handleAddAttendee(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/batches/${id}/attendees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        amount_paid: Number(form.amount_paid),
        phone_number: form.phone_number,
        age: form.age ? Number(form.age) : undefined,
        about: form.about || undefined,
        location: form.location || undefined,
      }),
    });
    setForm({
      name: "",
      amount_paid: "",
      phone_number: "",
      age: "",
      about: "",
      location: "",
    });
    setShowAttendeeForm(false);
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteAttendee(attendeeId: string) {
    if (!confirm("Delete this attendee?")) return;
    await fetch(`/api/batches/${id}/attendees/${attendeeId}`, {
      method: "DELETE",
    });
    setRefreshKey((k) => k + 1);
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/batches/${id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionForm),
    });
    setSessionForm({ session_name: "", session_date: "" });
    setShowSessionForm(false);
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Delete this session?")) return;
    await fetch(`/api/batches/${id}/sessions/${sessionId}`, {
      method: "DELETE",
    });
    setRefreshKey((k) => k + 1);
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

  if (!batch) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-sage">Batch not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-sage hover:text-saffron transition-colors"
          >
            ← Back to Batches
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-deep-blue">
            {batch.batch_name}
          </h1>
          <p className="text-sage text-sm mt-1">
            {attendees.length} attendee{attendees.length !== 1 ? "s" : ""} •{" "}
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-cream rounded-xl p-1 mb-8">
          <button
            onClick={() => setActiveTab("attendees")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "attendees"
                ? "bg-white text-deep-blue shadow-sm"
                : "text-sage hover:text-deep-blue"
            }`}
          >
            Attendees ({attendees.length})
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "sessions"
                ? "bg-white text-deep-blue shadow-sm"
                : "text-sage hover:text-deep-blue"
            }`}
          >
            Sessions ({sessions.length})
          </button>
        </div>

        {/* Attendees Tab */}
        {activeTab === "attendees" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-deep-blue">
                Registered Attendees
              </h2>
              <button
                onClick={() => setShowAttendeeForm(!showAttendeeForm)}
                className="px-4 py-2 bg-saffron hover:bg-saffron/90 text-white text-sm font-medium rounded-xl transition-all shadow-md shadow-saffron/20"
              >
                + Add Attendee
              </button>
            </div>

            {showAttendeeForm && (
              <div className="mb-6 bg-white rounded-2xl shadow-md border border-saffron/10 p-6">
                <h3 className="text-md font-semibold text-deep-blue mb-4">
                  Register New Attendee
                </h3>
                <form
                  onSubmit={handleAddAttendee}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) =>
                        setForm({ ...form, phone_number: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Amount Paid *
                    </label>
                    <input
                      type="number"
                      value={form.amount_paid}
                      onChange={(e) =>
                        setForm({ ...form, amount_paid: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      value={form.age}
                      onChange={(e) =>
                        setForm({ ...form, age: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      About
                    </label>
                    <input
                      type="text"
                      value={form.about}
                      onChange={(e) =>
                        setForm({ ...form, about: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-deep-blue hover:bg-deep-blue/90 text-white font-medium rounded-xl transition-all"
                    >
                      Register Attendee
                    </button>
                  </div>
                </form>
              </div>
            )}

            {attendees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-saffron/10">
                <span className="text-4xl block mb-3">🙏</span>
                <p className="text-sage">
                  No attendees registered yet. Add your first attendee above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendees.map((a) => (
                  <div
                    key={a._id}
                    className="bg-white rounded-xl shadow-sm border border-saffron/10 p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-deep-blue">
                          {a.name}
                        </span>
                        {a.age && (
                          <span className="text-xs text-sage bg-cream px-2 py-0.5 rounded-full">
                            Age: {a.age}
                          </span>
                        )}
                        {a.location && (
                          <span className="text-xs text-sage bg-cream px-2 py-0.5 rounded-full">
                            {a.location}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-sage">
                        <span>{a.phone_number}</span>
                        <span>Paid: {a.amount_paid}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAttendee(a._id)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-2 p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-deep-blue">
                Saturday Sessions
              </h2>
              <button
                onClick={() => setShowSessionForm(!showSessionForm)}
                className="px-4 py-2 bg-saffron hover:bg-saffron/90 text-white text-sm font-medium rounded-xl transition-all shadow-md shadow-saffron/20"
              >
                + New Session
              </button>
            </div>

            {showSessionForm && (
              <div className="mb-6 bg-white rounded-2xl shadow-md border border-saffron/10 p-6">
                <h3 className="text-md font-semibold text-deep-blue mb-4">
                  Create Saturday Session
                </h3>
                <form
                  onSubmit={handleCreateSession}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Session Name *
                    </label>
                    <input
                      type="text"
                      value={sessionForm.session_name}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          session_name: e.target.value,
                        })
                      }
                      placeholder="e.g., Saturday Youth Awakening"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Session Date *
                    </label>
                    <input
                      type="date"
                      value={sessionForm.session_date}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          session_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-deep-blue hover:bg-deep-blue/90 text-white font-medium rounded-xl transition-all"
                    >
                      Create Session
                    </button>
                  </div>
                </form>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-saffron/10">
                <span className="text-4xl block mb-3">📅</span>
                <p className="text-sage">
                  No sessions created yet. Create your first Saturday session.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s._id}
                    className="bg-white rounded-xl shadow-sm border border-saffron/10 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-deep-blue">
                          {s.session_name}
                        </h3>
                        <p className="text-sm text-sage mt-0.5">
                          {new Date(s.session_date).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/batches/${id}/sessions/${s._id}`}
                          className="text-sm px-4 py-2 bg-cream text-deep-blue hover:bg-saffron/10 rounded-lg transition-colors font-medium"
                        >
                          Attendance
                        </Link>
                        <Link
                          href={`/batches/${id}/sessions/${s._id}/calling`}
                          className="text-sm px-4 py-2 bg-saffron/10 text-saffron hover:bg-saffron/20 rounded-lg transition-colors font-medium"
                        >
                          Calling
                        </Link>
                        <button
                          onClick={() => handleDeleteSession(s._id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
