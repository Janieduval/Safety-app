import crypto from "crypto";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

// Shared pieces for the control centre and the JSAFE sites that connect to it.
//
// One GitHub repo, two kinds of site:
//  - a JSAFE project site (the usual)
//  - the control centre, when SITE_MODE=control-centre
//
// Both sides share CONTROL_CENTRE_KEY. Sites send it when they introduce
// themselves, and the control centre sends it when it asks for a site's numbers.

export function isControlCentre(): boolean {
  return (process.env.SITE_MODE ?? "").trim().toLowerCase() === "control-centre";
}

export function controlKey(): string {
  return (process.env.CONTROL_CENTRE_KEY ?? "").trim();
}

// Compares the key in a request with ours, without leaking timing.
export function keyMatches(given: string | null | undefined): boolean {
  const ours = controlKey();
  if (!ours || !given) return false;
  const a = crypto.createHash("sha256").update(ours).digest();
  const b = crypto.createHash("sha256").update(given.trim()).digest();
  return crypto.timingSafeEqual(a, b);
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", controlKey()).update(payload).digest());
}

// A short-lived signed ticket, used by "Open admin" to log the owner straight
// into a site's admin without typing a password again.
export function signTicket(data: Record<string, unknown>, ttlSeconds = 60): string {
  const payload = b64url(JSON.stringify({ ...data, exp: Date.now() + ttlSeconds * 1000 }));
  return `${payload}.${sign(payload)}`;
}

export function readTicket(ticket: string | null | undefined): Record<string, any> | null {
  if (!ticket || !controlKey()) return null;
  const dot = ticket.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = ticket.slice(0, dot);
  const sig = ticket.slice(dot + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (typeof data.exp !== "number" || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

// ---------- Control centre owner login ----------

export const CC_COOKIE = "cc_session";

export function ownerEmail(): string {
  return (process.env.CONTROL_OWNER_EMAIL ?? "").trim().toLowerCase();
}

export function ownerPasswordMatches(given: string): boolean {
  const ours = process.env.CONTROL_OWNER_PASSWORD ?? "";
  if (!ours) return false;
  const a = crypto.createHash("sha256").update(ours).digest();
  const b = crypto.createHash("sha256").update(given).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isControlOwner(): Promise<boolean> {
  if (!isControlCentre()) return false;
  const email = await verifyAdminSessionToken(cookies().get(CC_COOKIE)?.value);
  return !!email && !!ownerEmail() && email.toLowerCase() === ownerEmail();
}
