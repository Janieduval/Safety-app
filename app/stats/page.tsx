"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

type Period = "day" | "week" | "month";

type Viewer = {
  role: "admin" | "supervisor";
  name: string | null;
  workerPageSlug: string | null;
};

type Stats = {
  viewer?: Viewer;
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

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";
const SIDEBAR_GRADIENT = "linear-gradient(180deg, #059669 0%, #047857 45%, #064e3b 100%)";

// One colour per chart, so each measure keeps the same colour everywhere.
const COLORS = {
  jsafes: "#059669",
  people: "#0284c7",
  reviews: "#d97706",
  hazards: "#e11d48",
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

// Longer label for the tooltip line, e.g. "Thu 9 Oct" or "Week of 6 Oct".
function bucketLongLabel(bucket: string, period: Period): string {
  if (period === "month") {
    const [y, m] = bucket.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-AU", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const [y, m, d] = bucket.split("-").map(Number);
  const text = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    weekday: period === "day" ? "short" : undefined,
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return period === "week" ? `Week of ${text}` : text;
}

const PERIOD_TEXT: Record<Period, { title: string; unit: string; plural: string }> = {
  day: { title: "Last 30 days", unit: "day", plural: "days" },
  week: { title: "Last 12 weeks", unit: "week", plural: "weeks" },
  month: { title: "Last 12 months", unit: "month", plural: "months" },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2c3 .3 5.5 2.7 5.5 5.8" />
    </>
  ),
  saved: <path d="M6 3h12v18l-6-4-6 4z" />,
  export: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />,
  stats: <path d="M4 20V11M10 20V5M16 20v-6M2 20h20" />,
  supervisor: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12l2 2 4-4" />
    </>
  ),
  pen: (
    <>
      <path d="M14.5 3.5l4 4L9 17l-5 1 1-5z" />
      <path d="M12.5 5.5l4 4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
};

function Icon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

// Rounds the top of the chart up to a tidy number (5, 10, 20, 50...).
function niceMax(n: number): number {
  if (n <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * pow >= n) return step * pow;
  }
  return 10 * pow;
}

function formatAvg(n: number): string {
  return n >= 10 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>("day");
  const [stats, setStats] = useState<Stats | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
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
        if (data) {
          setStats(data);
          if (data.viewer) setViewer(data.viewer);
        }
      })
      .catch(() => setError("Could not load statistics."));
  }, [period]);

  if (unauthorized) {
    return (
      <main
        className="min-h-dvh w-full min-w-0 flex items-center justify-center px-4 py-10"
        style={{ background: BRAND_GRADIENT }}
      >
        <div className="w-full max-w-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192_2.png"
            alt=""
            className="w-16 h-16 mx-auto rounded-2xl shadow-lg ring-2 ring-white/30"
          />
          <p className="mt-3 text-2xl font-extrabold tracking-wide text-white">JSAFE</p>
          <p className="text-sm text-emerald-50/90">Take 5. Work safe. Go home safe.</p>
          <div className="mt-6 bg-white rounded-2xl shadow-xl p-5 space-y-3">
            <p className="font-semibold text-neutral-900">Please log in to view statistics</p>
            <Link
              href="/admin/login"
              className="block w-full rounded-xl bg-emerald-700 text-white font-semibold py-2.5 hover:bg-emerald-800"
            >
              Admin login
            </Link>
            <Link
              href="/supervisor/login"
              className="block w-full rounded-xl border border-neutral-300 text-neutral-800 font-semibold py-2.5 hover:bg-neutral-50"
            >
              Supervisor login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isAdmin = viewer?.role === "admin";
  const dashboardHref = viewer?.role === "supervisor" ? "/supervisor" : "/admin/dashboard";
  const roleLabel = viewer ? (isAdmin ? "Admin" : "Supervisor") : "";

  const navItems = isAdmin
    ? [
        { href: "/admin/dashboard", label: "Dashboard", icon: "home" },
        { href: "/admin/people", label: "People", icon: "people" },
        { href: "/admin/hazard-templates", label: "Saved answers", icon: "saved" },
        { href: "/admin/export", label: "Export", icon: "export" },
        { href: "/stats", label: "Statistics", icon: "stats" },
        { href: "/supervisor/login", label: "Supervisor", icon: "supervisor" },
        ...(viewer?.workerPageSlug
          ? [{ href: `/${viewer.workerPageSlug}`, label: "Worker page", icon: "phone" }]
          : []),
      ]
    : [
        { href: "/supervisor", label: "Dashboard", icon: "home" },
        { href: "/stats", label: "Statistics", icon: "stats" },
      ];

  const labels = stats ? stats.buckets.map((b) => bucketLabel(b, period)) : [];
  const longLabels = stats ? stats.buckets.map((b) => bucketLongLabel(b, period)) : [];

  return (
    <div className="min-h-dvh w-full min-w-0 bg-neutral-50 md:flex">
      {/* ---------- Computer: JSAFE sidebar ---------- */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:sticky md:top-0 md:h-dvh md:overflow-y-auto text-white px-4 py-6"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <div className="flex items-center gap-3 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192_2.png"
            alt=""
            className="w-11 h-11 rounded-xl shadow-lg ring-2 ring-white/25 shrink-0"
          />
          <div>
            <p className="text-xl font-extrabold tracking-wide leading-none">JSAFE</p>
            <p className="text-xs text-emerald-50/80 mt-1">{roleLabel}</p>
          </div>
        </div>
        <p className="mt-4 px-2 text-xs font-medium text-emerald-50/80 leading-snug">
          Take 5. Work safe. Go home safe.
        </p>

        <nav className="mt-8 space-y-1">
          {viewer &&
            navItems.map((item) => {
              const active = item.href === "/stats";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                    active
                      ? "font-semibold bg-white/15"
                      : "text-emerald-50/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="mt-auto pt-6">
          {viewer?.role === "supervisor" && (
            <>
              <p className="px-3 mb-2 text-xs text-emerald-50/70">
                Logged in as
                <span className="block text-sm font-semibold text-white truncate">
                  {viewer.name ?? "Supervisor"}
                </span>
              </p>
              <form action="/api/supervisor/logout" method="POST">
                <button
                  type="submit"
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
                >
                  Log out
                </button>
              </form>
            </>
          )}
          {isAdmin && (
            <AdminLogoutButton className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-60" />
          )}
        </div>
      </aside>

      {/* ---------- Main area ---------- */}
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-7">
        <div className="max-w-6xl mx-auto">
          {/* ---------- Phone: JSAFE header ---------- */}
          <header
            className="md:hidden -mx-4 -mt-6 mb-5 px-5 pt-6 pb-5 rounded-b-3xl text-white shadow-md"
            style={{ background: BRAND_GRADIENT }}
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href={dashboardHref}
                className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 -ml-1 rounded-full bg-white/15 ring-1 ring-white/30 active:bg-white/25"
              >
                <Icon name="back" className="w-4 h-4" />
                Dashboard
              </Link>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192_2.png"
                alt=""
                className="w-9 h-9 rounded-xl shadow ring-2 ring-white/30 shrink-0"
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
                <Icon name="stats" className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold leading-none">Statistics</p>
                <p className="text-sm text-emerald-50/90 mt-1">
                  {PERIOD_TEXT[period].title}
                  {roleLabel ? ` · ${roleLabel}` : ""}
                </p>
              </div>
            </div>
          </header>

          {/* ---------- Computer: title line ---------- */}
          <div className="hidden md:flex items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Statistics</h1>
              <p className="text-sm text-neutral-500">
                How JSAFE is being used on site · {PERIOD_TEXT[period].title.toLowerCase()}
              </p>
            </div>
            <PeriodSwitch period={period} onChange={setPeriod} />
          </div>

          {/* ---------- Phone: period switch ---------- */}
          <div className="md:hidden mb-5">
            <PeriodSwitch period={period} onChange={setPeriod} full />
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </p>
          )}

          {!stats && !error && <LoadingSkeleton />}

          {stats && (
            <div className="space-y-5 md:space-y-6">
              {/* Today */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                  Today
                </p>
                <div className="grid grid-cols-3 gap-2.5 md:gap-4">
                  <TodayTile
                    icon="clipboard"
                    color={COLORS.jsafes}
                    value={stats.today.assessments}
                    label="JSAFEs completed"
                  />
                  <TodayTile
                    icon="pen"
                    color={COLORS.people}
                    value={stats.today.workersSignedOn}
                    label="Workers signed on"
                  />
                  <TodayTile
                    icon="check"
                    color={COLORS.reviews}
                    value={stats.today.reviews}
                    label="Reviewed"
                  />
                </div>
              </section>

              {/* Trends */}
              <div className="grid gap-5 md:gap-6 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <BarChart
                    title="JSAFEs completed"
                    color={COLORS.jsafes}
                    labels={labels}
                    longLabels={longLabels}
                    values={stats.assessmentSeries}
                    period={period}
                    noun={["JSAFE", "JSAFEs"]}
                    tall
                  />
                </div>
                <BarChart
                  title="People signed on"
                  hint="Each worker counts once per period"
                  color={COLORS.people}
                  labels={labels}
                  longLabels={longLabels}
                  values={stats.workerSeries}
                  period={period}
                  noun={["worker", "workers"]}
                  hideTotal
                />
                <BarChart
                  title="Reviewed by supervisors"
                  color={COLORS.reviews}
                  labels={labels}
                  longLabels={longLabels}
                  values={stats.reviewSeries}
                  period={period}
                  noun={["review", "reviews"]}
                />
              </div>

              {/* Hazards + teams */}
              <div className="grid gap-5 md:gap-6 lg:grid-cols-2 items-start">
                <HazardList hazards={stats.hazards} period={period} />
                <TeamSection stats={stats} period={period} />
              </div>
            </div>
          )}

          <p className="mt-8 mb-2 text-center text-xs text-neutral-400">
            JSAFE · Daily Task Safety Awareness
          </p>
        </div>
      </main>
    </div>
  );
}

function PeriodSwitch({
  period,
  onChange,
  full = false,
}: {
  period: Period;
  onChange: (p: Period) => void;
  full?: boolean;
}) {
  return (
    <div
      className={`${full ? "flex w-full" : "inline-flex"} p-1 rounded-full bg-white border border-neutral-200 shadow-sm`}
    >
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={`${full ? "flex-1" : "px-5"} py-1.5 rounded-full text-sm font-semibold transition-colors ${
            period === p.key ? "bg-emerald-700 text-white shadow" : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function TodayTile({
  icon,
  color,
  value,
  label,
}: {
  icon: string;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-3 md:p-4">
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: color }}
        >
          <Icon name={icon} className="w-4 h-4 md:w-5 md:h-5" />
        </span>
        <p className="text-2xl md:text-3xl font-bold text-neutral-900 tabular-nums leading-none">
          {value}
        </p>
      </div>
      <p className="mt-2 text-[11px] md:text-sm text-neutral-600 leading-tight">{label}</p>
    </div>
  );
}

function BarChart({
  title,
  hint,
  color,
  labels,
  longLabels,
  values,
  period,
  noun,
  tall = false,
  hideTotal = false,
}: {
  title: string;
  hint?: string;
  color: string;
  labels: string[];
  longLabels: string[];
  values: number[];
  period: Period;
  noun: [string, string];
  tall?: boolean;
  hideTotal?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? total / values.length : 0;
  const peak = Math.max(0, ...values);
  const peakIndex = values.lastIndexOf(peak);
  const top = niceMax(peak);
  const word = (n: number) => (n === 1 ? noun[0] : noun[1]);

  // Only show some date labels underneath so they never overlap.
  const labelEvery = period === "day" ? 5 : 2;
  const showLabel = (i: number) =>
    i === values.length - 1 || (values.length - 1 - i) % labelEvery === 0;

  const headline =
    active !== null
      ? { value: values[active], caption: longLabels[active] }
      : hideTotal
      ? {
          value: values[values.length - 1] ?? 0,
          caption: period === "day" ? "Today" : `This ${PERIOD_TEXT[period].unit}`,
        }
      : { value: total, caption: `Total, ${PERIOD_TEXT[period].title.toLowerCase()}` };

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <h2 className="font-semibold text-neutral-900">{title}</h2>
          </div>
          {hint && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-neutral-900 tabular-nums leading-none">
            {headline.value}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">{headline.caption}</p>
        </div>
      </div>

      {/* Plot */}
      <div className="mt-6">
        <div className="relative">
          <div className={`relative ${tall ? "h-44 md:h-52" : "h-36 md:h-40"}`}>
            {/* Scale: the top line's value */}
            <span className="absolute right-0 -top-4 text-[10px] text-neutral-400 tabular-nums">
              {top}
            </span>
            {/* Light guide lines at the top and half way */}
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-neutral-200" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-200" />
            <div className="absolute inset-x-0 bottom-0 border-t border-neutral-300" />

            <div
              className="relative h-full flex items-end gap-[2px] md:gap-1"
              onMouseLeave={() => setActive(null)}
            >
              {values.map((v, i) => {
                const dim = active !== null && active !== i;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${longLabels[i]}: ${v} ${word(v)}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive((cur) => (cur === i ? null : i))}
                    className="flex-1 h-full flex items-end justify-center focus:outline-none"
                  >
                    <span
                      className="block w-full max-w-[36px] rounded-t-[4px] transition-opacity"
                      style={{
                        height: `${(v / top) * 100}%`,
                        minHeight: v > 0 ? 3 : 0,
                        background: color,
                        opacity: dim ? 0.35 : 1,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date labels */}
          <div className="flex gap-[2px] md:gap-1 mt-1.5">
            {labels.map((l, i) => (
              <span
                key={i}
                className={`flex-1 min-w-0 flex text-[10px] whitespace-nowrap ${
                  i === labels.length - 1 ? "justify-end" : "justify-center"
                } ${active === i ? "text-neutral-900 font-semibold" : "text-neutral-500"}`}
              >
                {showLabel(i) || active === i ? l : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer facts */}
      <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-600">
        <span>
          Average{" "}
          <strong className="text-neutral-900 tabular-nums">{formatAvg(avg)}</strong> per{" "}
          {PERIOD_TEXT[period].unit}
        </span>
        {peak > 0 && (
          <span>
            Busiest <strong className="text-neutral-900">{longLabels[peakIndex]}</strong> ({peak})
          </span>
        )}
        <span className="text-neutral-400 md:hidden">Tap a bar for details</span>
      </div>
    </section>
  );
}

function HazardList({
  hazards,
  period,
}: {
  hazards: { key: string; label: string; count: number }[];
  period: Period;
}) {
  const [showAll, setShowAll] = useState(false);
  const max = hazards.length ? Math.max(...hazards.map((h) => h.count)) : 0;
  const list = showAll ? hazards : hazards.slice(0, 8);

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.hazards }} />
        <h2 className="font-semibold text-neutral-900">Most common hazards</h2>
      </div>
      <p className="text-xs text-neutral-500 mt-0.5 mb-4">
        Times answered &quot;Yes&quot; · {PERIOD_TEXT[period].title.toLowerCase()}
      </p>

      {hazards.length === 0 ? (
        <EmptyNote text="No hazards recorded in this period." />
      ) : (
        <>
          <ol className="space-y-3">
            {list.map((h, i) => (
              <li key={h.key} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-800 truncate">{h.label}</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">{h.count}</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${max ? (h.count / max) * 100 : 0}%`,
                        background: COLORS.hazards,
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {hazards.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {showAll ? "Show top 8" : `Show all ${hazards.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function TeamSection({ stats, period }: { stats: Stats; period: Period }) {
  const max = stats.teams.length ? Math.max(...stats.teams.map((t) => t.total)) : 0;
  const columns = stats.teamBuckets.map((b) => bucketLabel(b, period));
  const cellMax = Math.max(1, ...stats.teams.flatMap((t) => t.counts));

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.jsafes }} />
        <h2 className="font-semibold text-neutral-900">JSAFEs per team</h2>
      </div>
      <p className="text-xs text-neutral-500 mt-0.5 mb-4">
        Most recent {stats.teamBuckets.length} {PERIOD_TEXT[period].plural}
      </p>

      {stats.teams.length === 0 ? (
        <EmptyNote text="No JSAFEs in this period." />
      ) : (
        <>
          {/* Phone: one row per team with a small strip of recent counts */}
          <ul className="md:hidden space-y-4">
            {stats.teams.map((t) => (
              <li key={t.team}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium text-neutral-800 truncate">{t.team}</span>
                  <span className="font-bold text-neutral-900 tabular-nums">{t.total}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${max ? (t.total / max) * 100 : 0}%`,
                      background: COLORS.jsafes,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex gap-1">
                  {t.counts.map((c, i) => (
                    <div key={i} className="flex-1 min-w-0 text-center">
                      <div
                        className="h-6 rounded-md flex items-center justify-center text-[11px] font-semibold tabular-nums"
                        style={cellStyle(c, cellMax)}
                      >
                        {c || ""}
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-0.5 truncate">{columns[i]}</p>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          {/* Computer: table with shaded cells */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Team</th>
                  {columns.map((c, i) => (
                    <th key={i} className="py-2 px-1 font-medium text-center whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                  <th className="py-2 pl-3 font-semibold text-right text-neutral-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.teams.map((t) => (
                  <tr key={t.team} className="border-t border-neutral-100">
                    <td className="py-2 pr-3 text-neutral-800 font-medium whitespace-nowrap">
                      {t.team}
                    </td>
                    {t.counts.map((c, i) => (
                      <td key={i} className="py-1.5 px-1">
                        <div
                          className="h-7 min-w-[2.25rem] rounded-md flex items-center justify-center text-xs font-semibold tabular-nums"
                          style={cellStyle(c, cellMax)}
                        >
                          {c || ""}
                        </div>
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-bold text-neutral-900 tabular-nums">
                      {t.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// Darker green for busier cells; empty cells stay light grey.
function cellStyle(count: number, max: number): React.CSSProperties {
  if (count === 0) return { background: "#f5f5f4", color: "#a3a3a3" };
  const t = count / max;
  if (t > 0.66) return { background: "#047857", color: "#ffffff" };
  if (t > 0.33) return { background: "#34d399", color: "#064e3b" };
  return { background: "#d1fae5", color: "#065f46" };
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="text-sm text-neutral-500 bg-neutral-50 rounded-xl px-4 py-6 text-center">
      {text}
    </p>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-3 gap-2.5 md:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 md:h-24 bg-white rounded-2xl border border-neutral-200" />
        ))}
      </div>
      <div className="h-72 bg-white rounded-2xl border border-neutral-200" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-60 bg-white rounded-2xl border border-neutral-200" />
        <div className="h-60 bg-white rounded-2xl border border-neutral-200" />
      </div>
    </div>
  );
}
