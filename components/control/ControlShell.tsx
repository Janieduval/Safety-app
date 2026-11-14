"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddCompanyButton from "@/components/control/AddCompanyButton";

// The control centre frame: green sidebar on a computer, green header with
// tabs on a phone. Same look as the JSAFE admin pages.

const SIDEBAR = "linear-gradient(180deg, #059669 0%, #047857 45%, #064e3b 100%)";
const HEADER = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";

const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  health: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  idea: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export function CIcon({ name, className = "w-[18px] h-[18px]" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}

export default function ControlShell({
  companies,
  children,
}: {
  companies: { id: string; name: string; color: string }[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const on = (href: string) => (href === "/control" ? path === "/control" : path.startsWith(href));

  const logout = async () => {
    await fetch("/api/control/login", { method: "DELETE" }).catch(() => {});
    router.push("/control-login");
  };

  const main = [
    { href: "/control", label: "Overview", icon: "home" },
    { href: "/control/health", label: "Site health", icon: "health" },
    { href: "/control/suggestions", label: "Suggestions", icon: "idea" },
  ];
  const item = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${active ? "font-semibold bg-white/15 text-white" : "text-emerald-50/90 hover:bg-white/10 hover:text-white"}`;

  return (
    <div className="min-h-dvh w-full min-w-0 bg-neutral-50 md:flex">
      {/* Computer: sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:sticky md:top-0 md:h-dvh md:overflow-y-auto text-white px-4 py-6" style={{ background: SIDEBAR }}>
        <div className="flex items-center gap-3 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192_2.png" alt="" className="w-11 h-11 rounded-xl shadow-lg ring-2 ring-white/25 shrink-0" />
          <div>
            <p className="text-xl font-extrabold tracking-wide leading-none">JSAFE</p>
            <p className="text-xs text-emerald-50/80 mt-1">Control centre</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {main.map((m) => (
            <Link key={m.href} href={m.href} className={item(on(m.href))}>
              <CIcon name={m.icon} />
              {m.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-50/60">Companies</p>
        <nav className="space-y-1">
          {companies.map((c) => (
            <Link key={c.id} href={`/control/companies/${c.id}`} className={item(on(`/control/companies/${c.id}`))}>
              <span className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: c.color }}>
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
          <AddCompanyButton variant="sidebar" />
          <Link href="/control/new-project" className={item(on("/control/new-project"))}>
            <CIcon name="plus" />
            New project
          </Link>
        </nav>
        <div className="mt-auto pt-6">
          <button type="button" onClick={logout} className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 ring-1 ring-white/20 hover:bg-white/20">
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 pb-10 md:px-8 md:py-7">
        <div className="max-w-6xl mx-auto">
          {/* Phone: header with tabs */}
          <header className="md:hidden -mx-4 mb-5 px-5 pt-6 pb-4 rounded-b-3xl text-white shadow-md" style={{ background: HEADER }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192_2.png" alt="" className="w-10 h-10 rounded-xl shadow ring-2 ring-white/30" />
                <div>
                  <p className="text-xl font-extrabold leading-none">JSAFE</p>
                  <p className="text-xs text-emerald-50/90 mt-1">Control centre</p>
                </div>
              </div>
              <button type="button" onClick={logout} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/30">
                Log out
              </button>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
              {[...main, ...companies.map((c) => ({ href: `/control/companies/${c.id}`, label: c.name, icon: "" }))].map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full ${on(m.href) ? "bg-white text-emerald-800" : "bg-white/15"}`}
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </header>
          {children}
          <p className="mt-10 text-center text-xs text-neutral-400">JSAFE · Control centre</p>
        </div>
      </main>
    </div>
  );
}
