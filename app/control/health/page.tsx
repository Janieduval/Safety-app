import Link from "next/link";
import { Card, PageTop, Pill } from "@/components/control/ui";
import { problemsFor, readAllSites, whenText } from "@/lib/control/data";

// Site health: is every site working? What isn't?
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const states = await readAllSites();
  const problems = states.flatMap(problemsFor).sort((a, b) => (a.level === b.level ? 0 : a.level === "red" ? -1 : 1));

  return (
    <>
      <PageTop crumbs={[{ href: "/control", label: "Control centre" }, { label: "Site health" }]} title="Site health" sub="Is every site working? What isn't?" />

      <Card title="Problems to look at" className="mb-5">
        {problems.length === 0 ? (
          <p className="text-sm text-emerald-800 font-medium">✓ Every site is working.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {problems.map((p, i) => (
              <li key={i} className="py-3 flex items-start gap-3">
                <Pill tone={p.level}>{p.level === "red" ? "Problem" : "Check"}</Pill>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{p.title}</p>
                  <p className="text-xs text-neutral-500">
                    {p.siteName}
                    {p.detail ? ` · ${p.detail}` : ""}
                  </p>
                </div>
                <Link href={`/control/sites/${p.siteId}`} className="text-sm font-semibold text-emerald-700 shrink-0">
                  Look
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="All sites">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3">Site</th>
                <th className="py-2 pr-3">Up</th>
                <th className="py-2 pr-3">Errors today</th>
                <th className="py-2 pr-3">Last Take 5</th>
                <th className="py-2">Latest update</th>
              </tr>
            </thead>
            <tbody>
              {states.map((s) => {
                const d = s.data;
                const errors = d ? d.health.pdfFailedToday + d.health.photoFailedToday + d.health.pushFailedToday : null;
                return (
                  <tr key={s.site.id} className="border-t border-neutral-100 align-top">
                    <td className="py-2.5 pr-3">
                      <Link href={`/control/sites/${s.site.id}`} className="font-semibold text-neutral-900 hover:text-emerald-700">
                        {s.site.name}
                      </Link>
                      <p className="text-xs text-neutral-500">{s.site.company?.name ?? "No company"}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      {!s.reachable ? <Pill tone="red">Not answering</Pill> : s.error ? <Pill tone="amber">Check</Pill> : <Pill tone="green">✓ Up</Pill>}
                    </td>
                    <td className="py-2.5 pr-3">{errors === null ? "–" : errors > 0 ? <Pill tone="red">{errors}</Pill> : "0"}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{d ? whenText(d.usage.lastTake5At) : "–"}</td>
                    <td className="py-2.5 text-xs text-neutral-600">{d?.version.message ?? "–"}</td>
                  </tr>
                );
              })}
              {states.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-500">No projects connected yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
