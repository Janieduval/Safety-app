"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

// The shared JSAFE frame for admin and supervisor pages:
// green sidebar on a computer, green header with a back button on a phone.

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";
const SIDEBAR_GRADIENT = "linear-gradient(180deg, #059669 0%, #047857 45%, #064e3b 100%)";

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2c3 .3 5.5 2.7 5.5 5.8" />
    </>
  ),
  saved: <path d="M6 3h12v18l-6-4-6 4z" />,
  export: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />,
  stats: <path d="M4 20V11M10 20V5M16 20v-6M2 20h20" />,
  supervisor: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  doc: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h6" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
};

export function StaffIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

export default function StaffShell({
  role,
  active,
  title,
  subtitle,
  icon = "doc",
  backHref,
  backLabel = "Dashboard",
  supervisorName,
  actions,
  maxWidth = "max-w-3xl",
  children,
}: {
  role: "admin" | "supervisor";
  active?: string; // which menu item to highlight, e.g. "/admin/export"
  title: string;
  subtitle?: React.ReactNode;
  icon?: string;
  backHref?: string;
  backLabel?: string;
  supervisorName?: string | null;
  actions?: React.ReactNode; // buttons shown next to the title
  maxWidth?: string;
  children: React.ReactNode;
}) {
  const [workerPageSlug, setWorkerPageSlug] = useState<string | null>(null);
  const isAdmin = role === "admin";
  const home = isAdmin ? "/admin/dashboard" : "/supervisor";

  useEffect(() => {
    if (!isAdmin) return;
    // Only for the "Worker page" link in the admin menu.
    fetch("/api/admin/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setWorkerPageSlug(data?.projects?.[0]?.qrSlug ?? null))
      .catch(() => {});
  }, [isAdmin]);

  const navItems = isAdmin
    ? [
        { href: "/admin/dashboard", label: "Dashboard", icon: "home" },
        { href: "/admin/people", label: "People", icon: "people" },
        { href: "/admin/hazard-templates", label: "Saved answers", icon: "saved" },
        { href: "/admin/export", label: "Export", icon: "export" },
        { href: "/stats", label: "Statistics", icon: "stats" },
        { href: "/supervisor/login", label: "Supervisor", icon: "supervisor" },
        ...(workerPageSlug
          ? [{ href: `/${workerPageSlug}`, label: "Worker page", icon: "phone" }]
          : []),
      ]
    : [
        { href: "/supervisor", label: "Dashboard", icon: "home" },
        { href: "/stats", label: "Statistics", icon: "stats" },
      ];
  const activeHref = active ?? home;

  return (
    <div className="min-h-dvh w-full min-w-0 bg-neutral-50 md:flex">
      {/* ---------- Computer: JSAFE sidebar ---------- */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:sticky md:top-0 md:h-dvh md:overflow-y-auto text-white px-4 py-6"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <div className="flex items-center gap-3 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192_2.png"
            alt=""
            className="w-11 h-11 rounded-xl shadow-lg ring-2 ring-white/25 shrink-0"
          />
          <div>
            <p className="text-xl font-extrabold tracking-wide leading-none">JSAFE</p>
            <p className="text-xs text-emerald-50/80 mt-1">{isAdmin ? "Admin" : "Supervisor"}</p>
          </div>
        </div>
        <p className="mt-4 px-2 text-xs font-medium text-emerald-50/80 leading-snug">
          Take 5. Work safe. Go home safe.
        </p>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                item.href === activeHref
                  ? "font-semibold bg-white/15"
                  : "text-emerald-50/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              <StaffIcon name={item.icon} className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          {isAdmin ? (
            <AdminLogoutButton className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-60" />
          ) : (
            <>
              {supervisorName && (
                <p className="px-3 mb-2 text-xs text-emerald-50/70">
                  Logged in as
                  <span className="block text-sm font-semibold text-white truncate">
                    {supervisorName}
                  </span>
                </p>
              )}
              <form action="/api/supervisor/logout" method="POST">
                <button
                  type="submit"
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
                >
                  Log out
                </button>
              </form>
            </>
          )}
        </div>
      </aside>

      {/* ---------- Main area ---------- */}
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-7">
        <div className={`${maxWidth} mx-auto`}>
          {/* ---------- Phone: JSAFE header ---------- */}
          <header
            className="md:hidden -mx-4 -mt-6 mb-5 px-5 pt-6 pb-5 rounded-b-3xl text-white shadow-md"
            style={{ background: BRAND_GRADIENT }}
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href={backHref ?? home}
                className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 -ml-1 rounded-full bg-white/15 ring-1 ring-white/30 active:bg-white/25"
              >
                <StaffIcon name="back" className="w-4 h-4" />
                {backLabel}
              </Link>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192_2.png"
                alt=""
                className="w-9 h-9 rounded-xl shadow ring-2 ring-white/30 shrink-0"
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
                <StaffIcon name={icon} className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold leading-tight">{title}</p>
                {subtitle && <p className="text-sm text-emerald-50/90 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
          </header>

          {/* ---------- Computer: title line ---------- */}
          <div className="hidden md:flex items-end justify-between gap-4 mb-6">
            <div className="min-w-0">
              {backHref && (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 mb-1"
                >
                  <StaffIcon name="back" className="w-4 h-4" />
                  {backLabel}
                </Link>
              )}
              <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
              {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
          </div>

          {children}

          <p className="mt-8 mb-2 text-center text-xs text-neutral-400">
            JSAFE · Daily Task Safety Awareness
          </p>
        </div>
      </main>
    </div>
  );
}
