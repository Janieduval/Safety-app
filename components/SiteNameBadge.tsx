"use client";

import { createContext, useContext, useEffect, useState } from "react";

// On the login pages: which project (and company) this JSAFE site is for,
// so people know they're in the right place.
//
// The login pages' layouts look this up on the server and hand it over with
// SiteInfoProvider, so it shows straight away with the page. Without it, the
// badge looks it up itself.

type SiteInfo = { project: string | null; company: string | null };

const SiteInfoContext = createContext<SiteInfo | null>(null);

export function SiteInfoProvider({ value, children }: { value: SiteInfo; children: React.ReactNode }) {
  return <SiteInfoContext.Provider value={value}>{children}</SiteInfoContext.Provider>;
}

export default function SiteNameBadge() {
  const fromServer = useContext(SiteInfoContext);
  // Only use it if the server actually found something.
  const given = fromServer && (fromServer.project || fromServer.company) ? fromServer : null;
  const [fetched, setFetched] = useState<SiteInfo | null>(null);

  useEffect(() => {
    if (given) return;
    fetch("/api/site-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setFetched(d ?? { project: null, company: null }))
      .catch(() => setFetched({ project: null, company: null }));
  }, [given]);

  const info = given ?? fetched;

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
