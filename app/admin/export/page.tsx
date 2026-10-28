"use client";
import { useEffect, useState } from "react";
import StaffShell, { StaffIcon } from "@/components/StaffShell";

type DateFolder = { date: string; count: number };
type ExportAssessment = {
  id: string;
  project: string;
  team: string;
  worker: string;
  status: string;
  filename: string;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  worker_completed: "bg-blue-100 text-blue-800",
  awaiting_supervisor_review: "bg-amber-100 text-amber-800",
  changes_required: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  archived: "bg-neutral-200 text-neutral-600",
};

function monthLabel(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });
}

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

  // Group the days by month so a long list is easy to scan.
  const months: { label: string; days: DateFolder[] }[] = [];
  for (const d of dates ?? []) {
    const label = monthLabel(d.date);
    const last = months[months.length - 1];
    if (last && last.label === label) last.days.push(d);
    else months.push({ label, days: [d] });
  }
  const total = (dates ?? []).reduce((n, d) => n + d.count, 0);

  return (
    <StaffShell
      role="admin"
      active="/admin/export"
      title="Export"
      subtitle="Download records by day"
      icon="export"
    >
      <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
        Pick a day to see its assessments, then download them all as one ZIP file — ready to
        upload wherever you keep your records.
      </p>

      {dates !== null && dates.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
            <p className="text-2xl font-bold text-neutral-900">{dates.length}</p>
            <p className="text-xs text-neutral-600">Days with records</p>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
            <p className="text-2xl font-bold text-neutral-900">{total}</p>
            <p className="text-xs text-neutral-600">Assessments in total</p>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {dates === null && !error && (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white rounded-2xl border border-neutral-200" />
          ))}
        </div>
      )}

      {dates !== null && dates.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-8 text-center">
          <span className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <StaffIcon name="export" />
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-800">No assessments to export yet.</p>
        </div>
      )}

      <div className="space-y-6">
        {months.map((m) => (
          <section key={m.label}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
              {m.label}
            </h2>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm divide-y divide-neutral-100 overflow-hidden">
              {m.days.map((d) => {
                const open = expanded === d.date;
                const day = new Date(d.date + "T00:00:00");
                return (
                  <div key={d.date}>
                    <button
                      type="button"
                      onClick={() => toggleDate(d.date)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 ${
                        open ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 flex flex-col items-center justify-center shrink-0 leading-none">
                        <span className="text-[10px] font-semibold uppercase">
                          {day.toLocaleDateString("en-AU", { weekday: "short" })}
                        </span>
                        <span className="text-base font-bold">{day.getDate()}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-neutral-900">
                          {day.toLocaleDateString("en-AU", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {d.count} assessment{d.count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        className={`w-5 h-5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {open && (
                      <div className="px-4 pb-4 pt-1 bg-emerald-50/30">
                        <a href={`/api/admin/export/${d.date}/zip`} className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800">
                          <StaffIcon name="export" className="w-4 h-4" />
                          Download all as ZIP
                        </a>

                        {loadingDate === d.date && (
                          <p className="mt-3 text-sm text-neutral-500">Loading...</p>
                        )}
                        {assessments[d.date] && (
                          <ul className="mt-3 space-y-2">
                            {assessments[d.date].map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center gap-3 rounded-xl bg-white border border-neutral-200 px-3 py-2"
                              >
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-medium text-neutral-900 truncate">
                                    {a.worker || a.filename}
                                  </span>
                                  <span className="block text-xs text-neutral-500 truncate">
                                    {[a.team, a.project].filter(Boolean).join(" · ") || a.filename}
                                  </span>
                                </span>
                                {a.status && (
                                  <span
                                    className={`hidden sm:inline-block shrink-0 text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ${
                                      STATUS_BADGE[a.status] ?? "bg-neutral-100 text-neutral-700"
                                    }`}
                                  >
                                    {a.status.replace(/_/g, " ")}
                                  </span>
                                )}
                                <a href={`/api/assessments/${a.id}/pdf?view=1`} target="_blank" rel="noreferrer" className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-emerald-600 text-emerald-700 font-semibold hover:bg-emerald-50">
                                  Open
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </StaffShell>
  );
}
