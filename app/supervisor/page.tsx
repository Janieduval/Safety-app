import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";

export const dynamic = "force-dynamic";

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

// Short names for the phone status filters, in the order they appear.
const MOBILE_STATUSES: { key: string; label: string }[] = [
  { key: "awaiting_supervisor_review", label: "To review" },
  { key: "worker_completed", label: "Completed" },
  { key: "draft", label: "Draft" },
  { key: "changes_required", label: "Changes" },
  { key: "approved", label: "Approved" },
  { key: "archived", label: "Archived" },
];

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

  const assessments = await prisma.assessment.findMany({
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

  const counts = await prisma.assessment.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap: Record<string, number> = Object.fromEntries(
    counts.map((c) => [c.status, c._count])
  );
  const totalCount = counts.reduce((sum, c) => sum + c._count, 0);
  const toReview = countMap["awaiting_supervisor_review"] ?? 0;

  const statuses = [
    "draft",
    "worker_completed",
    "awaiting_supervisor_review",
    "changes_required",
    "approved",
    "archived",
  ];

  // Builds a supervisor dashboard link for a status, keeping the chosen project.
  const statusHref = (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (searchParams.projectId) params.set("projectId", searchParams.projectId);
    const q = params.toString();
    return `/supervisor${q ? `?${q}` : ""}`;
  };

  const todayLabel = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const firstName = currentSupervisor?.name?.trim().split(/\s+/)[0];

  return (
    <main className="min-h-dvh w-full min-w-0 bg-neutral-50 px-4 py-6 max-w-5xl mx-auto">
      {/* ---------- Phone: JSAFE header ---------- */}
      <header
        className="md:hidden -mx-4 -mt-6 mb-5 px-5 pt-8 pb-6 rounded-b-3xl text-white shadow-md"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)" }}
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
          <p className="text-lg font-bold leading-tight">
            {greetingSydney()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <p className="text-sm text-emerald-50/90">{todayLabel}</p>
        </div>
      </header>

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
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 20V11M10 20V5M16 20v-6M2 20h20" />
          </svg>
        </span>
        <span className="flex-1 text-sm font-semibold text-neutral-800">View statistics</span>
        <span className="text-neutral-400">→</span>
      </Link>

      {/* ---------- Phone: status filters ---------- */}
      <div className="md:hidden flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-3">
        {[{ key: "", label: "All" }, ...MOBILE_STATUSES].map((s) => {
          const active = (searchParams.status ?? "") === s.key;
          const n = s.key ? countMap[s.key] ?? 0 : totalCount;
          return (
            <Link
              key={s.key || "all"}
              href={statusHref(s.key || undefined)}
              className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${
                active
                  ? "bg-emerald-700 border-emerald-700 text-white font-semibold"
                  : "bg-white border-neutral-300 text-neutral-700"
              }`}
            >
              {s.label}
              <span
                className={`text-[11px] font-bold px-1.5 rounded-full ${
                  active ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Phone: project filters, only when there's more than one project */}
      {projects.length > 1 && (
        <div className="md:hidden flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/supervisor?projectId=${p.id}`}
              className={`shrink-0 whitespace-nowrap text-xs px-3 py-1 rounded-full border ${
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

      {/* ---------- Computer: header ---------- */}
      <div className="hidden md:flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Supervisor dashboard</h1>
          <p className="text-sm text-neutral-500">
            Logged in as {currentSupervisor?.name ?? "Supervisor"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/stats"
            className="text-sm px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium bg-white"
          >
            View statistics
          </Link>
          <form action="/api/supervisor/logout" method="POST">
            <button
              type="submit"
              className="text-sm px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      {/* ---------- Computer: status counts ---------- */}
      <div className="hidden md:grid grid-cols-6 gap-3 mb-6">
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/supervisor?status=${s}`}
            className={`rounded-lg border p-3 bg-white ${
              searchParams.status === s ? "border-emerald-600 ring-1 ring-emerald-600" : "border-neutral-200"
            }`}
          >
            <p className="text-2xl font-bold text-neutral-900">{countMap[s] ?? 0}</p>
            <p className="text-xs text-neutral-600 capitalize">{s.replace(/_/g, " ")}</p>
          </Link>
        ))}
      </div>

      {/* ---------- Computer: filters ---------- */}
      <div className="hidden md:flex flex-wrap gap-3 mb-4">
        <Link
          href="/supervisor"
          className="text-sm px-3 py-1.5 rounded-full border border-neutral-300 bg-white"
        >
          All statuses
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/supervisor?projectId=${p.id}`}
            className="text-sm px-3 py-1.5 rounded-full border border-neutral-300 bg-white"
          >
            {p.name}
          </Link>
        ))}
      </div>

      <form action="/supervisor" method="get" className="flex gap-2 mb-4">
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        {searchParams.projectId && <input type="hidden" name="projectId" value={searchParams.projectId} />}
        <input
          type="text"
          name="worker"
          defaultValue={searchParams.worker ?? ""}
          placeholder="Search by worker or team..."
          className="flex-1 min-w-0 md:max-w-xs rounded-xl md:rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
        />
        <button
          type="submit"
          className="text-sm px-4 py-2 rounded-xl md:rounded-lg bg-neutral-900 text-white font-medium"
        >
          Search
        </button>
        {searchParams.worker && (
          <Link
            href={`/supervisor${searchParams.status ? `?status=${searchParams.status}` : ""}`}
            className="text-sm px-4 py-2 rounded-xl md:rounded-lg border border-neutral-300 text-neutral-700 font-medium bg-white"
          >
            Clear
          </Link>
        )}
      </form>

      {/* ---------- Phone: cards ---------- */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-bold text-neutral-900">Assessments</h2>
          <span className="text-xs text-neutral-500">
            {assessments.length === 100 ? "Latest 100" : `${assessments.length} shown`}
          </span>
        </div>
        <div className="space-y-3">
          {assessments.map((a) => {
            const { flags, latestReview, today } = describe(a);
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm ${today ? "font-semibold text-blue-800" : "text-neutral-600"}`}>
                    {today && (
                      <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold uppercase">
                        Today
                      </span>
                    )}
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
      </div>

      {/* ---------- Computer: table (unchanged) ---------- */}
      <div className="hidden md:block bg-white rounded-lg border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-neutral-700 text-left">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Project</th>
              <th className="p-3">Worker</th>
              <th className="p-3">Team</th>
              <th className="p-3">Status</th>
              <th className="p-3">Flags</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const { flags, latestReview, today } = describe(a);
              return (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td
                    className={`p-3 whitespace-nowrap ${
                      today ? "bg-blue-50 font-semibold text-blue-900" : ""
                    }`}
                  >
                    {new Date(a.dateTime).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
                  </td>
                  <td className="p-3">{a.project.name}</td>
                  <td className="p-3">{a.completedByWorker?.name}</td>
                  <td className="p-3">{a.team?.label ?? a.otherTeamText ?? "—"}</td>
                  <td className="p-3">
                    <span className="capitalize">{a.status.replace(/_/g, " ")}</span>
                    {a.status === "awaiting_supervisor_review" && a.version > 1 && (
                      <span className="block text-xs font-semibold text-blue-700 mt-0.5">
                        Amended — v{a.version} ready for review
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {flags.length === 0 ? (
                      <span className="text-neutral-400">—</span>
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
                  <td className="p-3 whitespace-nowrap">
                    <Link
                      href={`/supervisor/assessments/${a.id}`}
                      className="text-emerald-700 font-medium hover:underline"
                    >
                      View
                    </Link>
                    {a.status === "awaiting_supervisor_review" && (
                      <Link
                        href={`/assess/${a.id}/supervisor-review?from=supervisor`}
                        className="text-amber-700 font-medium hover:underline ml-3"
                      >
                        Review
                      </Link>
                    )}
                    {(a.status === "approved" || a.status === "changes_required") && latestReview && (
                      <span className="text-neutral-500 ml-3">
                        Reviewed by {latestReview.supervisor?.name ?? "supervisor"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {assessments.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-500">
                  No assessments match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
