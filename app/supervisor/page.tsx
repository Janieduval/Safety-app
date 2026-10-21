import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";

export const dynamic = "force-dynamic";

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";
const SIDEBAR_GRADIENT = "linear-gradient(180deg, #059669 0%, #047857 45%, #064e3b 100%)";

function isTodaySydney(dateTime: Date | string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(dateTime)) === fmt.format(new Date());
}

// "Good morning" / "Good afternoon" / "Good evening" by Sydney time.
function greetingSydney(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  worker_completed: "bg-blue-100 text-blue-800",
  awaiting_supervisor_review: "bg-amber-100 text-amber-800",
  changes_required: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  archived: "bg-neutral-200 text-neutral-600",
};

const STATUS_DOT: Record<string, string> = {
  "": "bg-emerald-700",
  awaiting_supervisor_review: "bg-amber-500",
  worker_completed: "bg-blue-500",
  draft: "bg-neutral-400",
  changes_required: "bg-orange-500",
  approved: "bg-emerald-500",
  archived: "bg-neutral-300",
};

// Status filters, in the order they appear (phone pills and computer tiles).
const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "awaiting_supervisor_review", label: "To review" },
  { key: "worker_completed", label: "Completed" },
  { key: "draft", label: "Draft" },
  { key: "changes_required", label: "Changes" },
  { key: "approved", label: "Approved" },
  { key: "archived", label: "Archived" },
];

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  stats: <path d="M4 20V11M10 20V5M16 20v-6M2 20h20" />,
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

// Order for today's JSAFEs: still to review first, then not yet submitted,
// then already reviewed at the end of today's group. Older days keep their
// usual newest-first order underneath.
function reviewRank(a: any): number {
  if (!isTodaySydney(a.dateTime)) return 3;
  if (a.status === "awaiting_supervisor_review") return 0;
  if (
    a.status === "approved" ||
    a.status === "changes_required" ||
    a.status === "archived"
  )
    return 2;
  return 1;
}

// Works out the flags and latest review once, for both the phone cards and
// the computer table.
function describe(a: any) {
  const flags: string[] = [];
  if (a.step1Responses.some((r: any) => r.answer === false)) flags.push("Stop-work");
  if (a.accessCheck?.safe === false) flags.push("Access");
  if (
    a.hazardResponses.some((r: any) =>
      r.cards.some((c: any) => c.residualRisk === "high" || c.residualRisk === "extreme")
    )
  )
    flags.push("High/Extreme risk");
  if (a.newHazardFlag?.present) flags.push("New hazard");
  if (a.permits.length > 0 && a.permits.some((p: any) => !p.issuedReviewedSigned))
    flags.push("Permit unverified");

  const latestReview =
    a.supervisorReviews.length > 0 ? a.supervisorReviews[a.supervisorReviews.length - 1] : null;

  return { flags, latestReview, today: isTodaySydney(a.dateTime) };
}

function TodayBadge() {
  return (
    <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold uppercase">
      Today
    </span>
  );
}

export default async function SupervisorDashboard({
  searchParams,
}: {
  searchParams: { status?: string; projectId?: string; worker?: string };
}) {
  const supervisorId = await verifySupervisorSessionToken(
    cookies().get("supervisor_session")?.value
  );
  if (!supervisorId) {
    redirect("/supervisor/login");
  }

  const currentSupervisor = await prisma.supervisor.findUnique({
    where: { id: supervisorId },
  });

  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.projectId) where.projectId = searchParams.projectId;
  if (searchParams.worker?.trim()) {
    const term = searchParams.worker.trim();
    where.OR = [
      { completedByWorker: { name: { contains: term, mode: "insensitive" } } },
      { team: { label: { contains: term, mode: "insensitive" } } },
      { otherTeamText: { contains: term, mode: "insensitive" } },
    ];
  }

  const latestAssessments = await prisma.assessment.findMany({
    where,
    include: {
      project: true,
      completedByWorker: true,
      team: true,
      hazardResponses: { include: { cards: true } },
      step1Responses: true,
      accessCheck: true,
      newHazardFlag: true,
      permits: true,
      supervisorReviews: { include: { supervisor: true }, orderBy: { version: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // Sort is stable, so each group stays newest-first.
  const assessments = [...latestAssessments].sort((x, y) => reviewRank(x) - reviewRank(y));

  const counts = await prisma.assessment.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap: Record<string, number> = Object.fromEntries(
    counts.map((c) => [c.status, c._count])
  );
  const totalCount = counts.reduce((sum, c) => sum + c._count, 0);
  const toReview = countMap["awaiting_supervisor_review"] ?? 0;

  // Builds a supervisor dashboard link for a status, keeping the chosen project.
  const statusHref = (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (searchParams.projectId) params.set("projectId", searchParams.projectId);
    const q = params.toString();
    return `/supervisor${q ? `?${q}` : ""}`;
  };

  const statusOptions = STATUS_OPTIONS.map((s) => ({
    ...s,
    n: s.key ? countMap[s.key] ?? 0 : totalCount,
    active: (searchParams.status ?? "") === s.key,
  }));

  const todayLabel = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const firstName = currentSupervisor?.name?.trim().split(/\s+/)[0];
  const greeting = `${greetingSydney()}${firstName ? `, ${firstName}` : ""}`;

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
            <p className="text-xs text-emerald-50/80 mt-1">Supervisor</p>
          </div>
        </div>
        <p className="mt-4 px-2 text-xs font-medium text-emerald-50/80 leading-snug">
          Take 5. Work safe. Go home safe.
        </p>

        <nav className="mt-8 space-y-1">
          <Link
            href="/supervisor"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold bg-white/15"
          >
            <Icon name="home" className="w-[18px] h-[18px]" />
            Dashboard
          </Link>
          <Link
            href="/stats"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-emerald-50/90 hover:bg-white/10 hover:text-white"
          >
            <Icon name="stats" className="w-[18px] h-[18px]" />
            Statistics
          </Link>
        </nav>

        <div className="mt-auto pt-6">
          <p className="px-3 mb-2 text-xs text-emerald-50/70">
            Logged in as
            <span className="block text-sm font-semibold text-white truncate">
              {currentSupervisor?.name ?? "Supervisor"}
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
        </div>
      </aside>

      {/* ---------- Main area ---------- */}
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-7">
        <div className="max-w-6xl mx-auto">
          {/* ---------- Phone: JSAFE header ---------- */}
          <header
            className="md:hidden -mx-4 -mt-6 mb-5 px-5 pt-8 pb-6 rounded-b-3xl text-white shadow-md"
            style={{ background: BRAND_GRADIENT }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-192_2.png"
                  alt=""
                  className="w-12 h-12 rounded-2xl shadow-lg ring-2 ring-white/30 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold tracking-wide leading-none">JSAFE</p>
                  <p className="text-sm text-emerald-50/90 mt-1">Supervisor</p>
                </div>
              </div>
              <form action="/api/supervisor/logout" method="POST" className="shrink-0">
                <button
                  type="submit"
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/30 text-white active:bg-white/25"
                >
                  Log out
                </button>
              </form>
            </div>
            <p className="mt-4 text-base font-semibold text-white">
              Take 5. Work safe. Go home safe.
            </p>
            <div className="mt-4 pt-3 border-t border-white/20">
              <p className="text-lg font-bold leading-tight">{greeting}</p>
              <p className="text-sm text-emerald-50/90">{todayLabel}</p>
            </div>
          </header>

          {/* ---------- Computer: slim top line ---------- */}
          <div className="hidden md:flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{greeting}</h1>
              <p className="text-sm text-neutral-500">{todayLabel} · Supervisor dashboard</p>
            </div>
            {toReview > 0 && searchParams.status !== "awaiting_supervisor_review" && (
              <Link
                href={statusHref("awaiting_supervisor_review")}
                className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 pl-3 pr-1 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                Needs your review
                <span className="text-xs font-bold text-white bg-amber-600 rounded-full px-2.5 py-1">
                  {toReview} →
                </span>
              </Link>
            )}
          </div>

          {/* ---------- Phone: needs-review alert ---------- */}
          {toReview > 0 && searchParams.status !== "awaiting_supervisor_review" && (
            <Link
              href={statusHref("awaiting_supervisor_review")}
              className="md:hidden flex items-center justify-between gap-3 mb-4 rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-amber-900">Needs your review</p>
                <p className="text-xs text-amber-800">
                  {toReview} assessment{toReview === 1 ? "" : "s"} waiting for a supervisor
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-white bg-amber-600 rounded-full px-3 py-1">
                {toReview} →
              </span>
            </Link>
          )}

          {/* ---------- Phone: statistics shortcut ---------- */}
          <Link
            href="/stats"
            className="md:hidden flex items-center gap-3 mb-6 rounded-2xl bg-white border border-neutral-200 px-4 py-3 shadow-sm active:bg-neutral-50"
          >
            <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Icon name="stats" />
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-800">View statistics</span>
            <span className="text-neutral-400">→</span>
          </Link>

          {/* ---------- Status filters: pills on a phone ---------- */}
          <div className="md:hidden flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-3">
            {statusOptions.map((s) => (
              <Link
                key={s.key || "all"}
                href={statusHref(s.key || undefined)}
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${
                  s.active
                    ? "bg-emerald-700 border-emerald-700 text-white font-semibold"
                    : "bg-white border-neutral-300 text-neutral-700"
                }`}
              >
                {s.label}
                <span
                  className={`text-[11px] font-bold px-1.5 rounded-full ${
                    s.active ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {s.n}
                </span>
              </Link>
            ))}
          </div>

          {/* ---------- Status filters: compact tiles on a computer ---------- */}
          <div className="hidden md:grid grid-cols-7 gap-2.5 mb-6">
            {statusOptions.map((s) => (
              <Link
                key={s.key || "all"}
                href={statusHref(s.key || undefined)}
                className={`rounded-xl border px-3 py-2.5 transition ${
                  s.active
                    ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/15"
                    : "bg-white border-neutral-200 hover:border-emerald-300"
                }`}
              >
                <p className="text-xl font-bold text-neutral-900 leading-tight">{s.n}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s.key] ?? "bg-neutral-300"}`} />
                  {s.label}
                </p>
              </Link>
            ))}
          </div>

          {/* Project filters, only when there's more than one project */}
          {projects.length > 1 && (
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-3 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/supervisor?projectId=${p.id}`}
                  className={`shrink-0 whitespace-nowrap text-xs md:text-sm px-3 py-1 rounded-full border ${
                    searchParams.projectId === p.id
                      ? "bg-neutral-900 border-neutral-900 text-white"
                      : "bg-white border-neutral-300 text-neutral-700"
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}

          {/* ---------- Heading + search ---------- */}
          <div className="md:flex md:items-center md:justify-between md:gap-4 mb-3">
            <div className="flex items-baseline justify-between gap-3 mb-3 md:mb-0">
              <h2 className="text-base md:text-lg font-bold text-neutral-900">Assessments</h2>
              <span className="text-xs text-neutral-500 md:ml-2">
                {assessments.length === 100 ? "Latest 100" : `${assessments.length} shown`}
              </span>
            </div>
            <form action="/supervisor" method="get" className="flex gap-2 md:w-96">
              {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
              {searchParams.projectId && (
                <input type="hidden" name="projectId" value={searchParams.projectId} />
              )}
              <input
                type="text"
                name="worker"
                defaultValue={searchParams.worker ?? ""}
                placeholder="Search by worker or team..."
                className="flex-1 min-w-0 rounded-xl border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
              <button
                type="submit"
                className="text-sm px-4 py-2 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800"
              >
                Search
              </button>
              {searchParams.worker && (
                <Link
                  href={`/supervisor${searchParams.status ? `?status=${searchParams.status}` : ""}`}
                  className="text-sm px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-medium bg-white"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>

          {/* ---------- Phone: cards ---------- */}
          <div className="md:hidden space-y-3">
            {assessments.map((a) => {
              const { flags, latestReview, today } = describe(a);
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm ${today ? "font-semibold text-blue-800" : "text-neutral-600"}`}>
                      {today && <TodayBadge />}
                      {new Date(a.dateTime).toLocaleString("en-AU", {
                        timeZone: "Australia/Sydney",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <span
                      className={`shrink-0 text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ${
                        STATUS_BADGE[a.status] ?? "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {a.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="mt-2 font-semibold text-neutral-900">
                    {a.completedByWorker?.name ?? "Unknown worker"}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {a.project.name} · {a.team?.label ?? a.otherTeamText ?? "No team"}
                  </p>

                  {a.status === "awaiting_supervisor_review" && a.version > 1 && (
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      Amended — v{a.version} ready for review
                    </p>
                  )}

                  {flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {flags.map((f) => (
                        <span
                          key={f}
                          className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {(a.status === "approved" || a.status === "changes_required") && latestReview && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Reviewed by {latestReview.supervisor?.name ?? "supervisor"}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/supervisor/assessments/${a.id}`}
                      className="flex-1 text-center text-sm px-3 py-2 rounded-xl border border-emerald-700 text-emerald-700 font-semibold"
                    >
                      View
                    </Link>
                    {a.status === "awaiting_supervisor_review" && (
                      <Link
                        href={`/assess/${a.id}/supervisor-review?from=supervisor`}
                        className="flex-1 text-center text-sm px-3 py-2 rounded-xl bg-amber-600 text-white font-semibold"
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
            {assessments.length === 0 && (
              <p className="p-6 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200">
                No assessments match this filter.
              </p>
            )}
          </div>

          {/* ---------- Computer: table ---------- */}
          <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => {
                  const { flags, latestReview, today } = describe(a);
                  return (
                    <tr key={a.id} className="border-t border-neutral-100 align-top hover:bg-neutral-50/70">
                      <td
                        className={`px-4 py-3 whitespace-nowrap ${
                          today ? "font-semibold text-blue-800" : "text-neutral-700"
                        }`}
                      >
                        {today && <TodayBadge />}
                        {new Date(a.dateTime).toLocaleString("en-AU", {
                          timeZone: "Australia/Sydney",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-neutral-900">{a.completedByWorker?.name ?? "—"}</p>
                        <p className="text-xs text-neutral-500">{a.project.name}</p>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{a.team?.label ?? a.otherTeamText ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ${
                            STATUS_BADGE[a.status] ?? "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {a.status.replace(/_/g, " ")}
                        </span>
                        {a.status === "awaiting_supervisor_review" && a.version > 1 && (
                          <span className="block text-xs font-semibold text-blue-700 mt-1">
                            Amended — v{a.version} ready for review
                          </span>
                        )}
                        {(a.status === "approved" || a.status === "changes_required") && latestReview && (
                          <span className="block text-xs text-neutral-500 mt-1">
                            Reviewed by {latestReview.supervisor?.name ?? "supervisor"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {flags.length === 0 ? (
                          <span className="text-neutral-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {flags.map((f) => (
                              <span
                                key={f}
                                className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {a.status === "awaiting_supervisor_review" && (
                            <Link
                              href={`/assess/${a.id}/supervisor-review?from=supervisor`}
                              className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700"
                            >
                              Review
                            </Link>
                          )}
                          <Link
                            href={`/supervisor/assessments/${a.id}`}
                            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-700 font-semibold hover:bg-emerald-50"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {assessments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No assessments match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
