import Link from "next/link";
import AddCompanyButton from "@/components/control/AddCompanyButton";
import { Bars, Card, Dot, PageTop, Pill, btnGreen } from "@/components/control/ui";
import { listCompanies, problemsFor, readAllSites, whenText, type SiteState } from "@/lib/control/data";

// Control centre overview: is everything working, how JSAFE is being used,
// every company with its projects, and the suggestion box.

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function siteTone(s: SiteState): "green" | "red" | "amber" | "grey" {
  const p = problemsFor(s);
  if (p.some((x) => x.level === "red")) return "red";
  if (s.data && s.data.usage.total === 0) return "grey";
  if (p.length) return "amber";
  return "green";
}

export default async function ControlOverview() {
  const [companies, states] = await Promise.all([listCompanies(), readAllSites()]);
  const problems = states.flatMap(problemsFor).sort((a, b) => (a.level === b.level ? 0 : a.level === "red" ? -1 : 1));

  // Usage across every site.
  const withData = states.filter((s) => s.data);
  const week = withData.reduce((n, s) => n + s.data!.usage.weekTotal, 0);
  const lastWeek = withData.reduce((n, s) => n + s.data!.usage.lastWeekTotal, 0);
  const people = withData.reduce((n, s) => n + s.data!.usage.peopleWeek, 0);
  const newPeople = withData.reduce((n, s) => n + s.data!.usage.newPeopleWeek, 0);
  const days = Array.from({ length: 7 }, (_, i) => withData.reduce((n, s) => n + (s.data!.usage.days[i]?.count ?? 0), 0));
  const live = withData.filter((s) => s.data!.usage.total > 0).length;
  const change = lastWeek ? Math.round(((week - lastWeek) / lastWeek) * 100) : null;

  // Suggestions from every site, newest first.
  const ideas = withData
    .flatMap((s) => s.data!.suggestions.map((x) => ({ ...x, siteName: s.site.name, siteId: s.site.id })))
    .filter((x) => x.status === "new" || x.status === "planned")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const newIdeas = ideas.filter((x) => x.status === "new").length;

  const groups = [
    ...companies.map((c) => ({ company: c, sites: states.filter((s) => s.site.companyId === c.id) })),
    ...(states.some((s) => !s.site.companyId) ? [{ company: null, sites: states.filter((s) => !s.site.companyId) }] : []),
  ];

  const red = problems.some((p) => p.level === "red");
  const statusTone = problems.length === 0 ? "green" : red ? "red" : "amber";
  const statusStyle = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-300 text-amber-900",
    red: "bg-red-50 border-red-200 text-red-900",
  }[statusTone];

  const today = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <PageTop
        title={greeting()}
        sub={`${today} · ${companies.length} compan${companies.length === 1 ? "y" : "ies"} · ${states.length} project${states.length === 1 ? "" : "s"}`}
        actions={
          <>
            <AddCompanyButton />
            <Link href="/control/new-project" className={btnGreen}>
              + New project
            </Link>
          </>
        }
      />

      {/* Is everything OK? */}
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3.5 mb-4 ${statusStyle}`}>
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold shrink-0 ${
            statusTone === "green" ? "bg-emerald-600" : statusTone === "red" ? "bg-red-600" : "bg-amber-500"
          }`}
        >
          {statusTone === "green" ? "✓" : "!"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">
            {states.length === 0
              ? "No projects connected yet"
              : problems.length === 0
              ? "All sites working"
              : `Everything's running, with ${problems.length} thing${problems.length === 1 ? "" : "s"} to look at`}
          </p>
          <p className="text-sm opacity-80 md:truncate">
            {states.length === 0
              ? "Set up a project and it will appear here."
              : problems.length === 0
              ? "No problems found on any site."
              : problems.slice(0, 2).map((p) => `${p.title} at ${p.siteName}`).join(" · ")}
          </p>
        </div>
        {problems.length > 0 && (
          <Link href="/control/health" className="w-full md:w-auto text-center text-sm px-4 py-2 rounded-xl bg-white/80 border border-current font-semibold">
            Look at them
          </Link>
        )}
      </div>

      {/* How JSAFE is being used */}
      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <Card>
          <p className="text-xs text-neutral-500">Take 5s this week</p>
          <p className="text-3xl font-bold mt-1">{week}</p>
          <p className={`text-xs font-semibold ${change === null ? "text-neutral-500" : change >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
            {change === null ? "First week" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% on last week`}
          </p>
          <div className="mt-3">
            <Bars values={days} height="h-8" />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">People using JSAFE this week</p>
          <p className="text-3xl font-bold mt-1">{people}</p>
          <p className="text-xs font-semibold text-emerald-700">{newPeople ? `▲ ${newPeople} new this week` : "No new people this week"}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Sites live</p>
          <p className="text-3xl font-bold mt-1">{live}</p>
          <p className="text-xs text-neutral-500">
            {states.length - live > 0 ? `${states.length - live} not started or not answering` : "All sites in use"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {states.map((s) => (
              <span key={s.site.id} title={s.site.name} className={`w-5 h-5 rounded-md ${s.data && s.data.usage.total > 0 ? "bg-emerald-500" : "bg-neutral-200"}`} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Companies" right={<span className="text-xs text-neutral-500">Tap one to see its projects</span>}>
          {groups.length === 0 && <p className="text-sm text-neutral-500">No companies yet. Add one, or set up a project with a COMPANY setting.</p>}
          <div className="space-y-3">
            {groups.map(({ company, sites }) => {
              const issues = sites.reduce((n, s) => n + problemsFor(s).length, 0);
              const ideasNew = sites.reduce((n, s) => n + (s.data?.suggestions.filter((x) => x.status === "new").length ?? 0), 0);
              const people = sites.reduce((n, s) => n + (s.data?.usage.workers ?? 0), 0);
              const sups = sites.reduce((n, s) => n + (s.data?.usage.supervisors ?? 0), 0);
              const inner = (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold shrink-0" style={{ background: company?.color ?? "#a3a3a3" }}>
                      {(company?.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900">{company?.name ?? "No company yet"}</p>
                      <p className="text-xs text-neutral-500">
                        {sites.length} project{sites.length === 1 ? "" : "s"} · {people} workers · {sups} supervisors
                      </p>
                    </div>
                    {company && <span className="text-neutral-400 text-xl">›</span>}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {sites.map((s) => (
                      <Pill key={s.site.id} tone={siteTone(s) === "grey" ? "grey" : siteTone(s) === "red" ? "red" : "green"}>
                        <Dot tone={siteTone(s)} />
                        {s.site.name}
                        {s.data ? ` · ${s.data.usage.today} today` : ""}
                      </Pill>
                    ))}
                    {sites.length > 0 && (issues === 0 ? <Pill tone="green">✓ Working</Pill> : <Pill tone="red">{issues} to look at</Pill>)}
                    {ideasNew > 0 && <Pill tone="blue">{ideasNew} new idea{ideasNew === 1 ? "" : "s"}</Pill>}
                    {sites.length === 0 && <span className="text-xs text-neutral-500">No projects yet</span>}
                  </div>
                </>
              );
              return company ? (
                <Link key={company.id} href={`/control/companies/${company.id}`} className="block rounded-2xl border border-neutral-200 p-3.5 hover:border-emerald-300 hover:shadow-sm">
                  {inner}
                </Link>
              ) : (
                <div key="none" className="rounded-2xl border border-dashed border-neutral-300 p-3.5">
                  {inner}
                  <p className="mt-2 text-xs text-neutral-500">Open each project's Details to choose its company.</p>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card
            title={
              <>
                Suggestion box {newIdeas > 0 && <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950">{newIdeas} new</span>}
              </>
            }
            right={<Link href="/control/suggestions" className="text-sm font-semibold text-emerald-700">See all</Link>}
          >
            {ideas.length === 0 ? (
              <p className="text-sm text-neutral-500">No new ideas.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {ideas.slice(0, 5).map((x) => (
                  <li key={x.siteId + x.id} className="py-2.5 flex gap-2.5">
                    <Pill tone={x.status === "new" ? "blue" : "amber"}>{x.status === "new" ? "New" : "Planned"}</Pill>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 break-words">{x.text}</p>
                      <p className="text-xs text-neutral-500">
                        {x.siteName} · {x.name || "No name"} · {whenText(x.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Problems" right={<Link href="/control/health" className="text-sm font-semibold text-emerald-700">Site health</Link>}>
            {problems.length === 0 ? (
              <p className="text-sm text-emerald-800 font-medium">✓ Nothing to look at.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {problems.slice(0, 4).map((p, i) => (
                  <li key={i} className="py-2.5 flex gap-2.5">
                    <Pill tone={p.level}>{p.level === "red" ? "Problem" : "Check"}</Pill>
                    <Link href={`/control/sites/${p.siteId}`} className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{p.title}</p>
                      <p className="text-xs text-neutral-500">{p.siteName}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
