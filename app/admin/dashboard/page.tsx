import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CopySignOnLinkButton from "@/components/CopySignOnLinkButton";
import ArchiveButton from "@/components/ArchiveButton";

export const dynamic = "force-dynamic";

function isTodaySydney(dateTime: Date | string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(dateTime)) === fmt.format(new Date());
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  worker_completed: "bg-blue-100 text-blue-800",
  awaiting_supervisor_review: "bg-amber-100 text-amber-800",
  changes_required: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  archived: "bg-neutral-200 text-neutral-600",
};

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

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { status?: string; projectId?: string; worker?: string };
}) {
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
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  const statuses = [
    "draft",
    "worker_completed",
    "awaiting_supervisor_review",
    "changes_required",
    "approved",
    "archived",
  ];

  const headerLink =
    "text-sm px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium bg-white text-center";

  return (
    <main className="min-h-dvh w-full min-w-0 bg-neutral-50 px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Admin dashboard</h1>
        <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:w-auto">
          <Link
            href="/admin/people"
            className="text-sm px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium text-center col-span-2 md:col-span-1"
          >
            Manage workers &amp; supervisors
          </Link>
          <Link href="/admin/hazard-templates" className={headerLink}>
            Saved hazard answers
          </Link>
          <Link href="/admin/export" className={headerLink}>
            Export assessments
          </Link>
          <Link href="/stats" className={headerLink}>
            View statistics
          </Link>
          <Link href="/supervisor/login" className={headerLink}>
            Supervisor login
          </Link>
          {projects[0] && (
            <Link href={`/${projects[0].qrSlug}`} className={`${headerLink} col-span-2 md:col-span-1`}>
              Assessment access page
            </Link>
          )}
        </div>
      </div>

      {/* Status counts: swipe sideways on a phone, six across on a computer */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-5 md:grid md:grid-cols-6 md:gap-3 md:mx-0 md:px-0 md:overflow-visible">
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/dashboard?status=${s}`}
            className={`shrink-0 min-w-[7.5rem] md:min-w-0 rounded-lg border p-3 bg-white ${
              searchParams.status === s ? "border-emerald-600 ring-1 ring-emerald-600" : "border-neutral-200"
            }`}
          >
            <p className="text-2xl font-bold text-neutral-900">{countMap[s] ?? 0}</p>
            <p className="text-xs text-neutral-600 capitalize">{s.replace(/_/g, " ")}</p>
          </Link>
        ))}
      </div>

      {/* Filters: one swipeable line on a phone */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-4 md:flex-wrap md:gap-3 md:mx-0 md:px-0 md:overflow-visible">
        <Link
          href="/admin/dashboard"
          className="shrink-0 whitespace-nowrap text-sm px-3 py-1.5 rounded-full border border-neutral-300 bg-white"
        >
          All statuses
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/admin/dashboard?projectId=${p.id}`}
            className="shrink-0 whitespace-nowrap text-sm px-3 py-1.5 rounded-full border border-neutral-300 bg-white"
          >
            {p.name}
          </Link>
        ))}
      </div>

      <form action="/admin/dashboard" method="get" className="flex gap-2 mb-4">
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        {searchParams.projectId && <input type="hidden" name="projectId" value={searchParams.projectId} />}
        <input
          type="text"
          name="worker"
          defaultValue={searchParams.worker ?? ""}
          placeholder="Search by worker or team..."
          className="flex-1 min-w-0 md:max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
        />
        <button
          type="submit"
          className="text-sm px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium"
        >
          Search
        </button>
        {searchParams.worker && (
          <Link
            href={`/admin/dashboard${searchParams.status ? `?status=${searchParams.status}` : ""}`}
            className="text-sm px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium bg-white"
          >
            Clear
          </Link>
        )}
      </form>

      {/* ---------- Phone: cards ---------- */}
      <div className="md:hidden space-y-3">
        {assessments.map((a) => {
          const { flags, latestReview, today } = describe(a);
          return (
            <div key={a.id} className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
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
                  href={`/admin/assessments/${a.id}`}
                  className="flex-1 text-center text-sm px-3 py-2 rounded-lg border border-emerald-700 text-emerald-700 font-semibold"
                >
                  View
                </Link>
                {a.status === "awaiting_supervisor_review" && (
                  <Link
                    href={`/assess/${a.id}/supervisor-review?from=admin`}
                    className="flex-1 text-center text-sm px-3 py-2 rounded-lg bg-amber-600 text-white font-semibold"
                  >
                    Review
                  </Link>
                )}
              </div>
              {(a.status !== "archived" || today) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
                  {a.status !== "archived" && <ArchiveButton assessmentId={a.id} />}
                  {today && <CopySignOnLinkButton assessmentId={a.id} />}
                </div>
              )}
            </div>
          );
        })}
        {assessments.length === 0 && (
          <p className="p-6 text-center text-neutral-500 bg-white rounded-xl border border-neutral-200">
            No assessments match this filter.
          </p>
        )}
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
                      href={`/admin/assessments/${a.id}`}
                      className="text-emerald-700 font-medium hover:underline"
                    >
                      View
                    </Link>
                    {a.status !== "archived" && <ArchiveButton assessmentId={a.id} />}
                    {today && <CopySignOnLinkButton assessmentId={a.id} />}
                    {a.status === "awaiting_supervisor_review" && (
                      <Link
                        href={`/assess/${a.id}/supervisor-review?from=admin`}
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
