"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type DateFolder = { date: string; count: number };
type ExportAssessment = {
  id: string;
  project: string;
  team: string;
  worker: string;
  status: string;
  filename: string;
};

export default function ExportPage() {
  const [dates, setDates] = useState<DateFolder[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, ExportAssessment[]>>({});
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/export/dates")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setDates(data.dates))
      .catch(() => setError("Could not load export list."));
  }, []);

  const toggleDate = async (date: string) => {
    if (expanded === date) {
      setExpanded(null);
      return;
    }
    setExpanded(date);
    if (!assessments[date]) {
      setLoadingDate(date);
      try {
        const res = await fetch(`/api/admin/export/${date}`);
        const data = await res.json();
        setAssessments((prev) => ({ ...prev, [date]: data.assessments ?? [] }));
      } finally {
        setLoadingDate(null);
      }
    }
  };

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Export assessments</h1>
        <Link href="/admin/dashboard" className="text-sm text-emerald-700 font-medium">
          ← Dashboard
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-4">
        Browse by day and download everything from that day as a single ZIP file, ready to
        upload wherever you keep your records.
      </p>

      {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
      {dates === null && !error && <p className="text-neutral-500 text-sm">Loading...</p>}
      {dates !== null && dates.length === 0 && (
        <p className="text-neutral-500 text-sm">No assessments found.</p>
      )}

      <div className="space-y-2">
        {(dates ?? []).map((d) => (
          <div
            key={d.date}
            className="border border-neutral-200 rounded-lg bg-white overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleDate(d.date)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-medium text-neutral-900">
                {new Date(d.date + "T00:00:00").toLocaleDateString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="text-sm text-neutral-500">
                {d.count} assessment{d.count === 1 ? "" : "s"}
              </span>
            </button>

            {expanded === d.date && (
              <div className="border-t border-neutral-200 px-4 py-3 space-y-3">
                <a
                  href={`/api/admin/export/${d.date}/zip`}
                  className="inline-block text-sm px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium"
                >
                  Download all as ZIP
                </a>

                {loadingDate === d.date && (
                  <p className="text-sm text-neutral-500">Loading...</p>
                )}
                {assessments[d.date] && (
                  <ul className="text-sm text-neutral-700 space-y-1">
                    {assessments[d.date].map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between border-b border-neutral-100 pb-1"
                      >
                        <span>{a.filename}</span>
                        <a
                          href={`/api/assessments/${a.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline ml-3 flex-shrink-0"
                        >
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
