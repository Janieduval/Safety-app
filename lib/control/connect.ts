import { prisma } from "@/lib/prisma";
import { controlKey, isControlCentre } from "@/lib/control/core";

// A JSAFE site introduces itself to the control centre: "I'm Yanco BESS, at
// this address, for ACLE Services". The control centre then shows it under
// that company. Needs CONTROL_CENTRE_URL, CONTROL_CENTRE_KEY and COMPANY.

// When this site last tried, so a slow or missing control centre never slows
// the site down: it tries at most every 30 minutes unless asked directly.
let lastTried = 0;

// This site's own public address.
export function siteUrl(fallbackOrigin?: string): string | null {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod.replace(/^https?:\/\//, "")}`;
  return fallbackOrigin ?? null;
}

export function controlCentreUrl(): string {
  return (process.env.CONTROL_CENTRE_URL ?? "").trim().replace(/\/+$/, "");
}

export type ConnectResult = { ok: boolean; message: string };

// `force` skips the "not more than once every 30 minutes" limit.
export async function connectToControlCentre(fallbackOrigin?: string, force = false): Promise<ConnectResult> {
  if (isControlCentre()) return { ok: false, message: "This is the control centre itself." };
  const cc = controlCentreUrl();
  const key = controlKey();
  if (!cc || !key) return { ok: false, message: "CONTROL_CENTRE_URL or CONTROL_CENTRE_KEY isn't set on this site." };
  if (!force && Date.now() - lastTried < 30 * 60 * 1000) return { ok: true, message: "Checked in recently." };
  lastTried = Date.now();

  const url = siteUrl(fallbackOrigin);
  if (!url) return { ok: false, message: "Couldn't work out this site's address." };

  const project = await prisma.project
    .findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } })
    .catch(() => null);

  try {
    const res = await fetch(`${cc}/api/control/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-control-key": key },
      body: JSON.stringify({
        url,
        company: (process.env.COMPANY ?? "").trim() || null,
        name: project?.name ?? process.env.PROJECT_NAME ?? "New project",
        address: project?.address ?? null,
        contractor: project?.contractor ?? null,
        slug: project?.qrSlug ?? null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data.error ?? `The control centre answered ${res.status}.` };
    return { ok: true, message: `Connected to the control centre under ${data.company ?? "no company yet"}.` };
  } catch {
    return { ok: false, message: "Couldn't reach the control centre. Check CONTROL_CENTRE_URL." };
  }
}
