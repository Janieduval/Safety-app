import { notFound } from "next/navigation";
import { Card, PageTop, Pill, btnGreen, btnPlain } from "@/components/control/ui";
import SiteControls from "@/components/control/SiteControls";
import { KIND_LABEL, listCompanies, problemsFor, readOneSite, whenText } from "@/lib/control/data";

// One project: is it working, what went wrong today, settings and suggestions.
export const dynamic = "force-dynamic";

function Check({ ok, warn, title, detail }: { ok: boolean; warn?: boolean; title: string; detail: React.ReactNode }) {
  const tone = ok ? "ok" : warn ? "warn" : "bad";
  return (
    <li className={`flex items-center gap-3 py-2.5 ${tone === "bad" ? "bg-red-50 -mx-3 px-3 rounded-xl" : ""}`}>
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
          tone === "ok" ? "bg-emerald-100 text-emerald-700" : tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
        }`}
      >
        {tone === "ok" ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500 break-words">{detail}</p>
      </div>
    </li>
  );
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", minute: "2-digit" });

export default async function SitePage({ params }: { params: { id: string } }) {
  const [s, companies] = await Promise.all([readOneSite(params.id), listCompanies()]);
  if (!s) notFound();
  const d = s.data;
  const problems = problemsFor(s);
  const errorsToday = d ? d.health.pdfFailedToday + d.health.photoFailedToday + d.health.pushFailedToday : null;
  const company = s.site.company;
  const newIdeas = d?.suggestions.filter((x) => x.status === "new") ?? [];

  return (
    <>
      <PageTop
        crumbs={[
          { href: "/control", label: "Control centre" },
          ...(company ? [{ href: `/control/companies/${company.id}`, label: company.name }] : []),
          { label: s.site.name },
        ]}
        title={s.site.name}
        sub={[s.site.address, s.site.contractor && `Contractor: ${s.site.contractor}`, s.site.url.replace(/^https:\/\//, "")].filter(Boolean).join(" · ")}
        actions={
          <>
            {s.site.slug && (
              <a href={`${s.site.url}/${s.site.slug}`} target="_blank" rel="noopener noreferrer" className={btnPlain}>Worker page ↗</a>
            )}
            <a href={`/api/control/open?site=${s.site.id}`} target="_blank" rel="noopener noreferrer" className={btnGreen}>Open admin ↗</a>
          </>
        }
      />

      {d && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
          {[
            [d.usage.today, "Take 5s today"],
            [d.usage.peopleToday, "Signed on today"],
            [errorsToday, "Errors today"],
            [d.usage.month, "Take 5s, last 30 days"],
            [d.usage.workers, "Workers"],
            [newIdeas.length, "New suggestions"],
          ].map(([v, l], i) => (
            <div key={i} className={`rounded-2xl border p-3.5 bg-white ${i === 2 && (v as number) > 0 ? "border-red-200 bg-red-50" : "border-neutral-200"}`}>
              <p className={`text-2xl font-bold ${i === 2 && (v as number) > 0 ? "text-red-700" : "text-neutral-900"}`}>{v}</p>
              <p className="text-xs text-neutral-500 mt-1">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <Card title="Is it working?" right={<span className="text-xs text-neutral-500">Checked just now</span>}>
            <ul className="divide-y divide-neutral-100">
              <Check
                ok={s.reachable && !s.error}
                title="Website is up"
                detail={
                  !s.reachable
                    ? "Not answering"
                    : s.error === "key"
                    ? "Answering, but the connection key doesn't match"
                    : s.error === "old"
                    ? "Answering, but running an older version"
                    : `Answered in ${((s.ms ?? 0) / 1000).toFixed(1)} s`
                }
              />
              {d && (
                <>
                  <Check ok title="Latest update" detail={d.version.message ? `${d.version.message}${d.version.commit ? ` (${d.version.commit})` : ""}` : "Not known"} />
                  <Check ok={d.health.database} title="Database" detail="Connected" />
                  <Check
                    ok={d.usage.total > 0}
                    warn
                    title="Workers are using it"
                    detail={d.usage.total > 0 ? `Last Take 5 ${whenText(d.usage.lastTake5At)} · ${d.usage.total} in total` : "No Take 5s yet"}
                  />
                  <Check
                    ok={d.health.photoStorage && d.health.photoFailedToday === 0}
                    title="Photo uploads"
                    detail={
                      !d.health.photoStorage
                        ? "Photo storage isn't set up: connect a Blob store to this site in Vercel"
                        : `${d.health.photosToday} today, ${d.health.photoFailedToday} failed${d.health.lastPhotoError ? ` · "${d.health.lastPhotoError}"` : ""}`
                    }
                  />
                  <Check
                    ok={d.health.pdfFailedToday === 0}
                    title="PDFs"
                    detail={`${d.health.pdfFailedToday} failed today${d.health.lastPdfError ? ` · "${d.health.lastPdfError}"` : ""}`}
                  />
                  <Check
                    ok={d.health.notificationsSetUp && d.health.pushFailedToday === 0}
                    warn={d.health.notificationsSetUp}
                    title="Notifications"
                    detail={
                      !d.health.notificationsSetUp
                        ? "Not set up: the VAPID settings are missing in Vercel"
                        : `${d.health.pushSentToday} sent today, ${d.health.pushFailedToday} failed`
                    }
                  />
                  <Check ok={d.health.dailyTidyUp} warn title="Daily tidy-up" detail={d.health.dailyTidyUp ? "Set up" : "CRON_SECRET is missing in Vercel"} />
                  <Check ok={!d.health.bootstrapLeftOn} warn title="First-setup key" detail={d.health.bootstrapLeftOn ? "Still on: delete BOOTSTRAP_SECRET in Vercel" : "Removed"} />
                </>
              )}
            </ul>
          </Card>

          {d && (
            <Card title="Errors today" right={<span className="text-xs text-neutral-500">What went wrong, in plain words</span>}>
              {d.errors.length === 0 ? (
                <p className="text-sm text-emerald-800 font-medium">✓ No errors today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">What</th>
                        <th className="py-2">What happened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.errors.map((e, i) => (
                        <tr key={i} className="border-t border-neutral-100 align-top">
                          <td className="py-2 pr-3 whitespace-nowrap">{time(e.at)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{KIND_LABEL[e.kind] ?? e.kind}</td>
                          <td className="py-2 break-words">
                            {e.detail ?? "No details"}
                            {e.count > 1 ? ` (×${e.count})` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {problems.length > 0 && (
            <Card title="To look at">
              <ul className="space-y-2.5">
                {problems.map((p, i) => (
                  <li key={i}>
                    <p className={`text-sm font-semibold ${p.level === "red" ? "text-red-700" : "text-amber-700"}`}>! {p.title}</p>
                    {p.detail && <p className="text-xs text-neutral-600">{p.detail}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Site settings">
            {d && (
              <ul className="divide-y divide-neutral-100 mb-4 text-sm">
                <li className="py-2 flex justify-between gap-3">
                  <span>Supervisors choose their own teams</span>
                  <Pill tone={d.settings.supervisorsChooseTeams ? "green" : "grey"}>{d.settings.supervisorsChooseTeams ? "Yes" : "Admin only"}</Pill>
                </li>
                <li className="py-2 flex justify-between gap-3">
                  <span>Sample people</span>
                  <Pill tone={d.settings.samplePeople ? "amber" : "grey"}>{d.settings.samplePeople ? "On" : "Off"}</Pill>
                </li>
                <li className="py-2 flex justify-between gap-3">
                  <span>Owner login set</span>
                  <Pill tone={d.health.ownerSet ? "green" : "amber"}>{d.health.ownerSet ? "Yes" : "No"}</Pill>
                </li>
              </ul>
            )}
            <p className="text-xs text-neutral-500 mb-3">These are set in the site&apos;s Vercel settings.</p>
            <SiteControls siteId={s.site.id} companyId={s.site.companyId} companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
          </Card>

          {d && (
            <Card
              title={`Suggestions${newIdeas.length ? ` · ${newIdeas.length} new` : ""}`}
              right={
                <a href={`/api/control/open?site=${s.site.id}&to=/admin/suggestions`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-700">Open ↗</a>
              }
            >
              {d.suggestions.length === 0 ? (
                <p className="text-sm text-neutral-500">No suggestions yet.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {d.suggestions.slice(0, 6).map((x) => (
                    <li key={x.id} className="py-2.5">
                      <div className="flex items-start gap-2">
                        <Pill tone={x.status === "new" ? "blue" : x.status === "planned" ? "amber" : x.status === "done" ? "green" : "grey"}>
                          {x.status === "not_doing" ? "Not doing" : x.status.charAt(0).toUpperCase() + x.status.slice(1)}
                        </Pill>
                        <p className="text-sm font-medium text-neutral-900 break-words">{x.text}</p>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {x.name || "No name"} · {x.role} · {whenText(x.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
