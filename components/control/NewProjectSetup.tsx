"use client";

import { useEffect, useMemo, useState } from "react";

// The "Set up a new project" checklist. Every setting the new site needs is
// filled in from the answers in step 1, with secret keys made here, so they
// can be copied straight into Vercel. Then it waits for the site to connect.

const kebab = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const slugOf = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");

function randomKey(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // ignore
        }
      }}
      className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap disabled:opacity-40 ${
        done ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5">
      <h2 className="flex items-center gap-2.5 font-semibold text-neutral-900 mb-3">
        <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-sm flex items-center justify-center shrink-0">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const field = "mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 bg-white text-base md:text-sm";
const code = "text-[12.5px] bg-neutral-100 rounded px-1.5 py-0.5 font-mono break-all";

type Waiting = { id: string; name: string; url: string; slug: string | null; company: { name: string } | null };

export default function NewProjectSetup({
  companies,
  defaultCompany,
  ccUrl,
  ccKey,
  ownerEmail,
}: {
  companies: string[];
  defaultCompany: string;
  ccUrl: string;
  ccKey: string;
  ownerEmail: string;
}) {
  const [company, setCompany] = useState(defaultCompany);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contractor, setContractor] = useState("");
  const [adminEmail, setAdminEmail] = useState(ownerEmail);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminTeams, setAdminTeams] = useState(false);
  const [siteAddress, setSiteAddress] = useState("");
  const [secrets, setSecrets] = useState<Record<string, string> | null>(null);
  const [vapid, setVapid] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const [connected, setConnected] = useState<Waiting | null>(null);

  // Secret keys, made once when the page opens.
  useEffect(() => {
    setSecrets({ admin: randomKey(), supervisor: randomKey(), cron: randomKey(24), bootstrap: randomKey(16) });
    fetch("/api/control/vapid")
      .then((r) => (r.ok ? r.json() : null))
      .then((k) => k && setVapid(k))
      .catch(() => {});
  }, []);

  // Watch for the new site to connect.
  useEffect(() => {
    if (connected) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/control/sites?since=${encodeURIComponent(startedAt)}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      const site = data?.sites?.[0];
      if (site) setConnected(site);
    }, 5000);
    return () => clearInterval(t);
  }, [connected, startedAt]);

  const siteUrl = useMemo(() => {
    const s = siteAddress.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return s ? `https://${s}` : "";
  }, [siteAddress]);

  const vercelName = `jsafe-${kebab(name) || "new-project"}`;
  const rows: [string, string, boolean?][] = [
    ["PROJECT_NAME", name],
    ["PROJECT_ADDRESS", address],
    ["PROJECT_CONTRACTOR", contractor],
    ["SAMPLE_PEOPLE", "no"],
    ["LISTS", "blank"],
    ["COMPANY", company, true],
    ["CONTROL_CENTRE_URL", ccUrl, true],
    ["CONTROL_CENTRE_KEY", ccKey, true],
    ["ADMIN_SESSION_SECRET", secrets?.admin ?? ""],
    ["SUPERVISOR_SESSION_SECRET", secrets?.supervisor ?? ""],
    ["CRON_SECRET", secrets?.cron ?? ""],
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", vapid?.publicKey ?? ""],
    ["VAPID_PRIVATE_KEY", vapid?.privateKey ?? ""],
    ["VAPID_SUBJECT", ccUrl || "https://example.com"],
    ["OWNER_ADMIN_EMAIL", ownerEmail || adminEmail],
    ["BOOTSTRAP_SECRET", secrets?.bootstrap ?? ""],
    ["ADMIN_BOOTSTRAP_EMAIL", adminEmail],
    ["ADMIN_BOOTSTRAP_PASSWORD", adminPassword],
    ...(adminTeams ? ([["SUPERVISORS_CAN_CHOOSE_TEAMS", "no"]] as [string, string][]) : []),
  ];
  const secretNames = ["CONTROL_CENTRE_KEY", "ADMIN_SESSION_SECRET", "SUPERVISOR_SESSION_SECRET", "CRON_SECRET", "VAPID_PRIVATE_KEY", "BOOTSTRAP_SECRET", "ADMIN_BOOTSTRAP_PASSWORD"];
  const missing = rows.filter(([, v]) => !v).map(([k]) => k);
  const allText = rows.map(([k, v]) => `${k}=${v}`).join("\n");

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr] items-start">
      <div className="space-y-4">
        <Step n={1} title="About the project">
          <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Company</label>
              <input list="cc-companies" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. ACLE Services" className={field} />
              <datalist id="cc-companies">
                {companies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-semibold">Project name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Moree Solar Farm" className={field} />
            </div>
            <div>
              <label className="text-sm font-semibold">Site address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 1 Example Road, Moree NSW 2400" className={field} />
            </div>
            <div>
              <label className="text-sm font-semibold">Contractor</label>
              <input value={contractor} onChange={(e) => setContractor(e.target.value)} placeholder="e.g. ACLE Services Pty Ltd" className={field} />
            </div>
            <div>
              <label className="text-sm font-semibold">First admin email</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label className="text-sm font-semibold">First admin password</label>
              <input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="At least 8 characters" className={field} />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={adminTeams} onChange={(e) => setAdminTeams(e.target.checked)} />
            Only admins set supervisors&apos; teams
          </label>
          <p className="mt-2 text-xs text-neutral-500">
            These fill in the settings below. The company is created in the control centre if it&apos;s new. The worker link will be{" "}
            <b>/{slugOf(name) || "projectname"}</b>.
          </p>
        </Step>

        <Step n={2} title="Create the database in Neon">
          <ol className="list-decimal pl-5 space-y-1.5 text-sm">
            <li>
              In Neon, click <b>New project</b>. Name it <code className={code}>{vercelName}</code> and choose region <b>AWS Asia Pacific (Sydney)</b>.
            </li>
            <li>
              Copy its <b>connection string</b>. You&apos;ll add it in Vercel as <code className={code}>DATABASE_URL</code>.
            </li>
          </ol>
        </Step>

        <Step n={3} title="Create the site in Vercel">
          <ol className="list-decimal pl-5 space-y-1.5 text-sm">
            <li>
              In Vercel, <b>Add New → Project</b>, and import <code className={code}>Janieduval/Safety-app</code>.
            </li>
            <li>
              Name it <code className={code}>{vercelName}</code>. Set <b>Build Command</b> to <code className={code}>npm run build:vercel</code>.
            </li>
            <li>
              Open <b>Environment Variables</b>. Tap <b>Copy all</b> below and paste into the first <b>Key</b> box: Vercel splits them into separate settings for you.
            </li>
            <li>
              Add one more by hand: <code className={code}>DATABASE_URL</code> with the connection string from Neon.
            </li>
            <li>
              Click <b>Deploy</b>.
            </li>
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={missing.length ? "" : allText} label="Copy all" />
            {missing.length > 0 && <span className="text-xs text-amber-700">Fill in step 1 first ({missing.length} still empty)</span>}
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <th className="py-1.5 pr-2">Name</th>
                  <th className="py-1.5 pr-2">Value</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-neutral-100">
                  <td className="py-1.5 pr-2 font-mono">DATABASE_URL</td>
                  <td className="py-1.5 pr-2 text-neutral-500">From Neon (step 2)</td>
                  <td />
                </tr>
                {rows.map(([k, v, hl]) => (
                  <tr key={k} className={`border-t border-neutral-100 ${hl ? "bg-emerald-50" : ""}`}>
                    <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{k}</td>
                    <td className="py-1.5 pr-2 font-mono break-all">
                      {!v ? <span className="text-amber-700 font-sans">Empty</span> : secretNames.includes(k) ? "••••••••••••" : v}
                    </td>
                    <td className="py-1.5 text-right">
                      <CopyButton text={v} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            The green rows connect the site to the control centre. Secret keys are made for you here, fresh for this site.
          </p>
        </Step>

        <Step n={4} title="Finish in Vercel">
          <ol className="list-decimal pl-5 space-y-1.5 text-sm">
            <li>
              <b>Settings → Functions → Function Region</b>: choose <b>Sydney (syd1)</b>.
            </li>
            <li>
              <b>Storage → Create → Blob</b>, name it <code className={code}>{vercelName}-photos</code>, and connect it to <b>this project only</b>. (Without it, photos can&apos;t be added.)
            </li>
            <li>Make a tiny commit in GitHub so the site rebuilds with these changes.</li>
          </ol>
        </Step>

        <Step n={5} title="First setup and connect">
          <label className="text-sm font-semibold">The new site&apos;s web address</label>
          <input
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
            placeholder={`e.g. ${vercelName}.vercel.app`}
            className={field}
          />
          <p className="mt-1 text-xs text-neutral-500">Shown in Vercel on the project&apos;s page once it&apos;s built.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={siteUrl && secrets ? `${siteUrl}/api/bootstrap?secret=${secrets.bootstrap}` : undefined} target="_blank" rel="noopener noreferrer" className={`text-sm px-4 py-2 rounded-xl font-semibold ${siteUrl ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-neutral-200 text-neutral-500 pointer-events-none"}`}>Run first setup ↗</a>
            <a href={siteUrl ? `${siteUrl}/api/control/connect` : undefined} target="_blank" rel="noopener noreferrer" className={`text-sm px-4 py-2 rounded-xl font-semibold border ${siteUrl ? "border-emerald-700 text-emerald-700 bg-white hover:bg-emerald-50" : "border-neutral-200 text-neutral-400 pointer-events-none"}`}>Connect now ↗</a>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            First setup creates the project and the admin login, and connects the site here. After that, delete <code className={code}>BOOTSTRAP_SECRET</code> and{" "}
            <code className={code}>ADMIN_BOOTSTRAP_PASSWORD</code> from the site&apos;s Vercel settings.
          </p>
        </Step>
      </div>

      <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 lg:sticky lg:top-6">
        <h2 className="font-semibold text-neutral-900 mb-3">Connection</h2>
        {!connected ? (
          <div className="text-center">
            <div className="w-11 h-11 mx-auto rounded-full border-4 border-emerald-100 border-t-emerald-700 animate-spin" />
            <p className="mt-3 font-semibold">Waiting for {name || "the new site"}…</p>
            <p className="mt-1 text-xs text-neutral-500">
              As soon as the site is set up, it appears here and under {company || "its company"}. You can leave this page; it&apos;ll still connect.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-extrabold">✓</div>
            <p className="mt-3 text-lg font-bold">Connected</p>
            <p className="text-sm text-neutral-600">
              {connected.name} is now under {connected.company?.name ?? "no company yet"}.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a href={`/api/control/open?site=${connected.id}`} target="_blank" rel="noopener noreferrer" className="text-sm px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold">Open admin ↗</a>
              {connected.slug && (
                <a href={`${connected.url}/${connected.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm px-4 py-2 rounded-xl border border-neutral-300 bg-white font-semibold">Worker page ↗</a>
              )}
              <a href={`/control/sites/${connected.id}`} className="text-sm px-4 py-2 rounded-xl border border-emerald-700 text-emerald-700 bg-white font-semibold">See its details</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
