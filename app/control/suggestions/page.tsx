import Link from "next/link";
import { Card, PageTop, Pill } from "@/components/control/ui";
import { readAllSites, whenText } from "@/lib/control/data";

// Every site's suggestion box in one list. Marking them is done on each
// site's own Suggestions page ("Open ↗").
export const dynamic = "force-dynamic";

const TABS = [
  { key: "new", label: "New" },
  { key: "planned", label: "Planned" },
  { key: "done", label: "Done" },
  { key: "all", label: "All" },
];

export default async function ControlSuggestions({ searchParams }: { searchParams: { status?: string } }) {
  const tab = TABS.some((t) => t.key === searchParams.status) ? searchParams.status! : "new";
  const states = await readAllSites();
  const all = states
    .filter((s) => s.data)
    .flatMap((s) => s.data!.suggestions.map((x) => ({ ...x, site: s.site })))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const shown = tab === "all" ? all : all.filter((x) => x.status === tab);

  return (
    <>
      <PageTop
        crumbs={[{ href: "/control", label: "Control centre" }, { label: "Suggestions" }]}
        title="Suggestions"
        sub="Ideas from every project. To mark one Planned or Done, open it on its site."
      />
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {TABS.map((t) => {
          const n = t.key === "all" ? all.length : all.filter((x) => x.status === t.key).length;
          return (
            <Link
              key={t.key}
              href={`/control/suggestions?status=${t.key}`}
              className={`shrink-0 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${
                tab === t.key ? "bg-emerald-700 border-emerald-700 text-white font-semibold" : "bg-white border-neutral-300 text-neutral-700"
              }`}
            >
              {t.label}
              <span className={`text-[11px] font-bold px-1.5 rounded-full ${tab === t.key ? "bg-white/25" : "bg-neutral-100 text-neutral-600"}`}>{n}</span>
            </Link>
          );
        })}
      </div>
      <Card>
        {shown.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {shown.map((x) => (
              <li key={x.site.id + x.id} className="py-3 flex items-start gap-3">
                <Pill tone={x.status === "new" ? "blue" : x.status === "planned" ? "amber" : x.status === "done" ? "green" : "grey"}>
                  {x.status === "not_doing" ? "Not doing" : x.status.charAt(0).toUpperCase() + x.status.slice(1)}
                </Pill>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 break-words whitespace-pre-wrap">{x.text}</p>
                  <p className="text-xs text-neutral-500">
                    {x.site.name} · {x.name || "No name"} · {x.role} · {whenText(x.createdAt)}
                  </p>
                </div>
                <a href={`/api/control/open?site=${x.site.id}&to=/admin/suggestions`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-700 shrink-0">Open ↗</a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
