import { prisma } from "@/lib/prisma";
import { controlKey } from "@/lib/control/core";

// Control centre: reads each site's numbers and health, and works out what
// needs a look. Sites are asked live every time a page opens.

export type SiteSummary = {
  project: { name: string; address: string | null; contractor: string | null; slug: string } | null;
  company: string | null;
  version: { commit: string | null; message: string | null };
  usage: {
    today: number;
    days: { date: string; count: number }[];
    weekTotal: number;
    lastWeekTotal: number;
    month: number;
    total: number;
    lastTake5At: string | null;
    peopleWeek: number;
    peopleToday: number;
    newPeopleWeek: number;
    workers: number;
    supervisors: number;
  };
  health: {
    database: boolean;
    photoStorage: boolean;
    notificationsSetUp: boolean;
    dailyTidyUp: boolean;
    ownerSet: boolean;
    bootstrapLeftOn: boolean;
    photosToday: number;
    photoFailedToday: number;
    pdfFailedToday: number;
    pushSentToday: number;
    pushFailedToday: number;
    lastPdfError: string | null;
    lastPhotoError: string | null;
    lastPushError: string | null;
  };
  errors: { at: string; kind: string; detail: string | null; count: number }[];
  suggestions: { id: string; text: string; name: string | null; role: string; status: string; createdAt: string }[];
  settings: { supervisorsChooseTeams: boolean; samplePeople: boolean };
};

export type SiteRow = Awaited<ReturnType<typeof listSites>>[number];

export type SiteState = {
  site: SiteRow;
  reachable: boolean;
  ms: number | null;
  error: string | null; // why it couldn't be read
  data: SiteSummary | null;
};

export type Problem = { level: "red" | "amber"; title: string; detail: string; siteId: string; siteName: string };

export async function listSites() {
  return prisma.ccSite.findMany({
    where: { archived: false },
    include: { company: true },
    orderBy: [{ name: "asc" }],
  });
}

export async function listCompanies() {
  return prisma.ccCompany.findMany({ orderBy: { name: "asc" } });
}

async function readSite(site: SiteRow): Promise<SiteState> {
  const started = Date.now();
  try {
    const res = await fetch(`${site.url}/api/control/summary`, {
      headers: { "x-control-key": controlKey() },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - started;
    if (res.status === 401) return { site, reachable: true, ms, error: "key", data: null };
    if (res.status === 404) return { site, reachable: true, ms, error: "old", data: null };
    if (!res.ok) return { site, reachable: true, ms, error: `status ${res.status}`, data: null };
    const data = (await res.json()) as SiteSummary;
    // Keep the name and address in step with the site.
    if (data.project && (data.project.name !== site.name || data.project.address !== site.address)) {
      prisma.ccSite
        .update({ where: { id: site.id }, data: { name: data.project.name, address: data.project.address, lastSeenAt: new Date() } })
        .catch(() => {});
    } else {
      prisma.ccSite.update({ where: { id: site.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
    }
    return { site, reachable: true, ms, error: null, data };
  } catch {
    return { site, reachable: false, ms: null, error: "unreachable", data: null };
  }
}

export async function readAllSites(sites?: SiteRow[]): Promise<SiteState[]> {
  const list = sites ?? (await listSites());
  return Promise.all(list.map(readSite));
}

export async function readOneSite(id: string): Promise<SiteState | null> {
  const site = await prisma.ccSite.findUnique({ where: { id }, include: { company: true } });
  return site ? readSite(site) : null;
}

const daysSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity);

// What needs a look, in plain words.
export function problemsFor(s: SiteState): Problem[] {
  const base = { siteId: s.site.id, siteName: s.site.name };
  const out: Problem[] = [];
  if (!s.reachable) {
    out.push({ ...base, level: "red", title: "Site isn't answering", detail: "The control centre couldn't reach it. Check the site in Vercel." });
    return out;
  }
  if (s.error === "key") {
    out.push({ ...base, level: "red", title: "Connection key doesn't match", detail: "CONTROL_CENTRE_KEY on the site isn't the same as on the control centre." });
    return out;
  }
  if (s.error === "old") {
    out.push({ ...base, level: "amber", title: "Site needs the latest update", detail: "It's running an older version of JSAFE. Commit any small change to update it." });
    return out;
  }
  if (s.error || !s.data) {
    out.push({ ...base, level: "red", title: "Site had a problem answering", detail: s.error ?? "No details" });
    return out;
  }
  const h = s.data.health;
  const u = s.data.usage;
  if (h.pdfFailedToday > 0)
    out.push({ ...base, level: "red", title: `${h.pdfFailedToday} PDF${h.pdfFailedToday === 1 ? "" : "s"} failed today`, detail: h.lastPdfError ?? "" });
  if (h.photoFailedToday > 0)
    out.push({ ...base, level: "red", title: `${h.photoFailedToday} photo upload${h.photoFailedToday === 1 ? "" : "s"} failed today`, detail: h.lastPhotoError ?? "" });
  if (h.pushFailedToday > 0)
    out.push({ ...base, level: "amber", title: `${h.pushFailedToday} notification${h.pushFailedToday === 1 ? "" : "s"} couldn't be sent today`, detail: h.lastPushError ?? "Phones may have turned notifications off." });
  if (!h.photoStorage)
    out.push({ ...base, level: "red", title: "Photo storage isn't set up", detail: "Workers can't add photos. In Vercel, connect a Blob store to this site." });
  if (!h.notificationsSetUp)
    out.push({ ...base, level: "amber", title: "Notifications aren't set up", detail: "The VAPID settings are missing in Vercel." });
  if (h.bootstrapLeftOn)
    out.push({ ...base, level: "amber", title: "First-setup key is still on", detail: "Delete BOOTSTRAP_SECRET from this site's Vercel settings." });
  if (u.total === 0)
    out.push({ ...base, level: "amber", title: "No Take 5s yet", detail: "Set up, but nobody has used it yet." });
  else if (daysSince(u.lastTake5At) > 3)
    out.push({ ...base, level: "amber", title: `Quiet: no Take 5s for ${Math.floor(daysSince(u.lastTake5At))} days`, detail: "Is the site still running?" });
  return out;
}

export function whenText(iso: string | null): string {
  if (!iso) return "Never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export const KIND_LABEL: Record<string, string> = { pdf: "PDF", photo: "Photo upload", push: "Notification" };
