"use client";

import { useEffect, useState } from "react";

// On the login pages: which project (and company) this JSAFE site is for,
// so people know they're in the right place.
export default function SiteNameBadge() {
  const [info, setInfo] = useState<{ project: string | null; company: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/site-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setInfo(d ?? { project: null, company: null }))
      .catch(() => setInfo({ project: null, company: null }));
  }, []);

  // Keeps the space while loading, so the page doesn't jump.
  if (!info) return <div className="mt-5 h-[60px]" aria-hidden />;
  if (!info.project && !info.company) return null;

  return (
    <div className="mt-5 w-full rounded-2xl bg-white/15 ring-1 ring-white/25 px-4 py-2.5 text-center">
      {info.project && <p className="text-lg font-bold leading-snug text-white">{info.project}</p>}
      {info.company && <p className="text-sm text-emerald-50/90">{info.company}</p>}
    </div>
  );
}
