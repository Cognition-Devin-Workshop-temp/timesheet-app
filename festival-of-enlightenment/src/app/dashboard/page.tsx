"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Batch {
  _id: string;
  batch_name: string;
  created_at: string;
}

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/batches");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!cancelled) setBatches(data);
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!batchName.trim()) return;

    await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch_name: batchName }),
    });

    setBatchName("");
    setShowForm(false);
    setRefreshKey((k) => k + 1);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This will delete all attendees and sessions in this batch.")) return;
    await fetch(`/api/batches/${id}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-deep-blue">
              Batches
            </h1>
            <p className="text-sage mt-1 text-sm">
              Manage your spiritual program batches
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-saffron hover:bg-saffron/90 text-white font-medium rounded-xl transition-all shadow-md shadow-saffron/20"
          >
            + New Batch
          </button>
        </div>

        {showForm && (
          <div className="mb-8 bg-white rounded-2xl shadow-md border border-saffron/10 p-6">
            <h3 className="text-lg font-semibold text-deep-blue mb-4">
              Create New Batch
            </h3>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Enter batch name (e.g., January 2025 Cohort)"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all bg-cream/30"
                required
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-deep-blue hover:bg-deep-blue/90 text-white font-medium rounded-xl transition-all"
              >
                Create
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-saffron/30 border-t-saffron rounded-full animate-spin" />
            <p className="mt-4 text-sage">Loading batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-saffron/10">
            <span className="text-5xl block mb-4">📿</span>
            <h3 className="text-lg font-medium text-deep-blue">
              No batches yet
            </h3>
            <p className="text-sage mt-2">
              Create your first batch to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <div
                key={batch._id}
                className="bg-white rounded-2xl shadow-md border border-saffron/10 p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-deep-blue group-hover:text-saffron transition-colors">
                    {batch.batch_name}
                  </h3>
                  <button
                    onClick={() => handleDelete(batch._id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-sm p-1"
                    title="Delete batch"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-sage mb-4">
                  Created{" "}
                  {new Date(batch.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <Link
                  href={`/batches/${batch._id}`}
                  className="inline-flex items-center text-sm font-medium text-saffron hover:text-saffron/80 transition-colors"
                >
                  Open Batch →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
