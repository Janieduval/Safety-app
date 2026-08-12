import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function isTodaySydney(dateTime: Date | string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(dateTime)) === fmt.format(new Date());
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
    where.completedByWorker = {
      name: { contains: searchParams.worker.trim(), mode: "insensitive" },
    };
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

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Admin dashboard</h1>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/people"
            className="text-sm px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium"
          >
            Manage workers &amp; supervisors
          </Link>
          <Link
            href="/supervisor/login"
            className="text-sm px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium bg-white"
          >
            Supervisor login
          </Link>
          {projects[0] && (
            <Link
              href={`/${projects[0].qrSlug}`}
              className="text-sm px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium bg-white"
            >
              Assessment access page
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/dashboard?status=${s}`}
            className={`rounded-lg border p-3 bg-white ${
              searchParams.status === s ? "border-emerald-600 ring-1 ring-emerald-600" : "border-neutral-200"
            }`}
          >
            <p className="text-2xl font-bold text-neutral-900">{countMap[s] ?? 0}</p>
            <p className="text-xs text-neutral-600 capitalize">{s.replace(/_/g, " ")}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Link
          href="/admin/dashboard"
          className="text-sm px-3 py-1.5 rounded-full border border-neutral-300 bg-white"
        >
          All statuses
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/admin/dashboard?projectId=${p.id}`}
            className="text-sm px-3 py-1.5 rounded-full border border-neutral-300 bg-white"
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
          placeholder="Search by worker name..."
          className="flex-1 max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
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

      <div className="bg-white rounded-lg border border-neutral-200 overflow-x-auto">
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
              const flags: string[] = [];
              if (a.step1Responses.some((r) => r.answer === false)) flags.push("Stop-work");
              if (a.accessCheck?.safe === false) flags.push("Access");
              if (
                a.hazardResponses.some((r) =>
                  r.cards.some((c) => c.residualRisk === "high" || c.residualRisk === "extreme")
                )
              )
                flags.push("High/Extreme risk");
              if (a.newHazardFlag?.present) flags.push("New hazard");
              if (a.permits.length > 0 && a.permits.some((p) => !p.issuedReviewedSigned))
                flags.push("Permit unverified");

              const latestReview =
                a.supervisorReviews.length > 0
                  ? a.supervisorReviews[a.supervisorReviews.length - 1]
                  : null;

              return (
                <tr key={a.id} className="border-t border-neutral-100">
                  <td
                    className={`p-3 whitespace-nowrap ${
                      isTodaySydney(a.dateTime) ? "bg-blue-50 font-semibold text-blue-900" : ""
                    }`}
                  >
                    {new Date(a.dateTime).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
                  </td>
                  <td className="p-3">{a.project.name}</td>
                  <td className="p-3">{a.completedByWorker?.name}</td>
                  <td className="p-3">{a.team?.label ?? a.otherTeamText ?? "—"}</td>
                  <td className="p-3 capitalize">{a.status.replace(/_/g, " ")}</td>
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
