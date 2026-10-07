"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Period = "day" | "week" | "month";

type Stats = {
  period: Period;
  buckets: string[];
  assessmentSeries: number[];
  workerSeries: number[];
  reviewSeries: number[];
  hazards: { key: string; label: string; count: number }[];
  teamBuckets: string[];
  teams: { team: string; counts: number[]; total: number }[];
  today: { assessments: number; workersSignedOn: number; reviews: number };
};

function bucketLabel(bucket: string, period: Period): string {
  if (period === "month") {
    const [y, m] = bucket.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-AU", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  const [y, m, d] = bucket.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const PERIOD_TEXT: Record<Period, { title: string; unit: string }> = {
  day: { title: "Last 30 days", unit: "day" },
  week: { title: "Last 12 weeks", unit: "week (Mon–Sun)" },
  month: { title: "Last 12 months", unit: "month" },
};

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>("day");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    setStats(null);
    setError(null);
    fetch(`/api/stats?period=${period}`)
      .then(async (res) => {
        if (res.status === 401) {
          setUnauthorized(true);
          return null;
        }
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => setError("Could not load statistics."));
  }, [period]);

  if (unauthorized) {
    return (
      <main className="min-h-dvh bg-neutral-50 px-4 py-10 max-w-md mx-auto text-center space-y-3">
        <p className="text-neutral-800 font-medium">Please log in to view statistics.</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/admin/login"
            className="text-sm px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium"
          >
            Admin login
          </Link>
          <Link
            href="/supervisor/login"
            className="text-sm px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium bg-white"
          >
            Supervisor login
          </Link>
        </div>
      </main>
    );
  }

  const maxHazard = stats?.hazards.length ? Math.max(...stats.hazards.map((h) => h.count)) : 0;

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Statistics</h1>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm text-emerald-700 font-medium"
        >
          ← Back
        </button>
      </div>

      <div className="flex gap-2">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-sm font-medium border capitalize ${
              period === p
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-300"
            }`}
          >
            {p === "day" ? "Daily" : p === "week" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
      {!stats && !error && <p className="text-neutral-500 text-sm">Loading...</p>}

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Completed today" value={stats.today.assessments} />
            <SummaryCard label="Workers signed on today" value={stats.today.workersSignedOn} />
            <SummaryCard label="Reviewed today" value={stats.today.reviews} />
          </div>

          <ChartCard
            title="JSAFEs completed"
            subtitle={`${PERIOD_TEXT[period].title}, per ${PERIOD_TEXT[period].unit}`}
            labels={stats.buckets.map((b) => bucketLabel(b, period))}
            values={stats.assessmentSeries}
            barClass="bg-emerald-600"
          />

          <ChartCard
            title="People signed on"
            subtitle="Individual workers who signed at least once in each period"
            labels={stats.buckets.map((b) => bucketLabel(b, period))}
            values={stats.workerSeries}
            barClass="bg-blue-600"
          />

          <ChartCard
            title="JSAFEs reviewed by supervisors"
            subtitle={`${PERIOD_TEXT[period].title}, per ${PERIOD_TEXT[period].unit}`}
            labels={stats.buckets.map((b) => bucketLabel(b, period))}
            values={stats.reviewSeries}
            barClass="bg-amber-500"
          />

          <section className="bg-white border border-neutral-200 rounded-lg p-4">
            <h2 className="font-semibold text-neutral-900">Most common hazards</h2>
            <p className="text-xs text-neutral-500 mb-3">
              How often each hazard was answered "Yes" — {PERIOD_TEXT[period].title.toLowerCase()}
            </p>
            {stats.hazards.length === 0 ? (
              <p className="text-sm text-neutral-500">No hazards recorded in this period.</p>
            ) : (
              <ul className="space-y-2">
                {stats.hazards.map((h) => (
                  <li key={h.key}>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-800 pr-2">{h.label}</span>
                      <span className="font-semibold text-neutral-900">{h.count}</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full mt-1">
                      <div
                        className="h-2 bg-red-500 rounded-full"
                        style={{ width: `${maxHazard ? (h.count / maxHazard) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-neutral-200 rounded-lg p-4">
            <h2 className="font-semibold text-neutral-900">JSAFEs per team</h2>
            <p className="text-xs text-neutral-500 mb-3">
              Most recent {stats.teamBuckets.length}{" "}
              {period === "day" ? "days" : period === "week" ? "weeks" : "months"}
            </p>
            {stats.teams.length === 0 ? (
              <p className="text-sm text-neutral-500">No assessments in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-600">
                      <th className="py-2 pr-3 font-medium">Team</th>
                      {stats.teamBuckets.map((b) => (
                        <th key={b} className="py-2 px-2 font-medium text-right whitespace-nowrap">
                          {bucketLabel(b, period)}
                        </th>
                      ))}
                      <th className="py-2 pl-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.teams.map((t) => (
                      <tr key={t.team} className="border-t border-neutral-100">
                        <td className="py-2 pr-3 text-neutral-800 whitespace-nowrap">{t.team}</td>
                        {t.counts.map((c, i) => (
                          <td
                            key={i}
                            className={`py-2 px-2 text-right ${
                              c === 0 ? "text-neutral-300" : "text-neutral-800"
                            }`}
                          >
                            {c}
                          </td>
                        ))}
                        <td className="py-2 pl-3 text-right font-semibold text-neutral-900">
                          {t.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3">
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-600">{label}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  labels,
  values,
  barClass,
}: {
  title: string;
  subtitle: string;
  labels: string[];
  values: number[];
  barClass: string;
}) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <section className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-neutral-900">{title}</h2>
        <span className="text-xs text-neutral-500">Total {total}</span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">{subtitle}</p>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 h-36" style={{ minWidth: `${values.length * 28}px` }}>
          {values.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[10px] text-neutral-600 mb-0.5">{v > 0 ? v : ""}</span>
              <div
                className={`w-full rounded-t ${barClass}`}
                style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? "3px" : "0" }}
                title={`${labels[i]}: ${v}`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1" style={{ minWidth: `${values.length * 28}px` }}>
          {labels.map((l, i) => (
            <span key={i} className="flex-1 text-[9px] text-neutral-500 text-center leading-tight">
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
