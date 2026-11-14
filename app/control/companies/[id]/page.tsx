import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Bars, Card, Dot, PageTop, Pill, btnGreen, btnOutline, btnPlain } from "@/components/control/ui";
import { problemsFor, readAllSites, whenText } from "@/lib/control/data";

// One company and its projects.
export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: { id: string } }) {
  const company = await prisma.ccCompany.findUnique({ where: { id: params.id } });
  if (!company) notFound();
  const sites = await prisma.ccSite.findMany({ where: { companyId: company.id, archived: false }, include: { company: true }, orderBy: { name: "asc" } });
  const states = await readAllSites(sites);
  const workers = states.reduce((n, s) => n + (s.data?.usage.workers ?? 0), 0);
  const sups = states.reduce((n, s) => n + (s.data?.usage.supervisors ?? 0), 0);

  return (
    <>
      <PageTop
        crumbs={[{ href: "/control", label: "Control centre" }, { label: company.name }]}
        title={
          <span className="inline-flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-extrabold" style={{ background: company.color }}>
              {company.name.charAt(0).toUpperCase()}
            </span>
            {company.name}
          </span>
        }
        sub={`${states.length} project${states.length === 1 ? "" : "s"} · ${workers} workers · ${sups} supervisors`}
        actions={
          <Link href={`/control/new-project?company=${encodeURIComponent(company.name)}`} className={btnGreen}>
            + New project
          </Link>
        }
      />

      {states.length === 0 && (
        <Card>
          <p className="text-sm text-neutral-600">
            No projects yet. Set up a project with <code className="text-xs bg-neutral-100 rounded px-1">COMPANY = {company.name}</code> and it will appear here.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {states.map((s) => {
          const problems = problemsFor(s);
          const u = s.data?.usage;
          const errors = s.data ? s.data.health.pdfFailedToday + s.data.health.photoFailedToday + s.data.health.pushFailedToday : null;
          return (
            <Card key={s.site.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-neutral-900">{s.site.name}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {s.site.address ? `${s.site.address} · ` : ""}
                    {s.site.url.replace(/^https:\/\//, "")}
                  </p>
                </div>
                {!s.reachable ? (
                  <Pill tone="red"><Dot tone="red" />Not answering</Pill>
                ) : problems.length === 0 ? (
                  <Pill tone="green"><Dot tone="green" />Working</Pill>
                ) : (
                  <Pill tone={problems.some((p) => p.level === "red") ? "red" : "amber"}>
                    {problems.length} to look at
                  </Pill>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  [u?.today ?? "–", "Take 5s today"],
                  [u?.peopleToday ?? "–", "Signed on today"],
                  [errors ?? "–", "Errors today"],
                  [u ? whenText(u.lastTake5At) : "–", "Last Take 5"],
                ].map(([v, l], i) => (
                  <div key={i} className="rounded-xl bg-neutral-50 px-2 py-2.5 text-center">
                    <p className={`font-bold ${i === 3 ? "text-sm" : "text-xl"} ${i === 2 && typeof v === "number" && v > 0 ? "text-red-700" : "text-neutral-900"}`}>{v}</p>
                    <p className="text-[11px] text-neutral-500">{l}</p>
                  </div>
                ))}
              </div>
              {u && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-neutral-700 mb-1.5">Take 5s · last 7 days</p>
                  <Bars values={u.days.map((d) => d.count)} />
                </div>
              )}
              {problems.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {problems.slice(0, 3).map((p, i) => (
                    <li key={i} className={`text-xs font-medium ${p.level === "red" ? "text-red-700" : "text-amber-700"}`}>
                      ! {p.title}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/control/sites/${s.site.id}`} className={btnGreen}>
                  Details
                </Link>
                <a href={`/api/control/open?site=${s.site.id}`} target="_blank" rel="noopener noreferrer" className={btnOutline}>Open admin ↗</a>
                {s.site.slug && (
                  <a href={`${s.site.url}/${s.site.slug}`} target="_blank" rel="noopener noreferrer" className={btnPlain}>Worker page ↗</a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
