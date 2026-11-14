import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isControlOwner, signTicket } from "@/lib/control/core";

// Control centre: "Open admin ↗". Sends the owner to the site's admin,
// already logged in, using a ticket that's only good for one minute.
// ?site=<id>&to=/admin/dashboard

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isControlOwner())) return NextResponse.redirect(new URL("/control-login", req.url));
  const site = await prisma.ccSite.findUnique({ where: { id: req.nextUrl.searchParams.get("site") ?? "" } });
  if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });
  const toRaw = req.nextUrl.searchParams.get("to") ?? "/admin/dashboard";
  const to = toRaw.startsWith("/admin") ? toRaw : "/admin/dashboard";
  const t = signTicket({ purpose: "open-admin", to, site: site.url });
  return NextResponse.redirect(`${site.url}/api/control/sso?t=${encodeURIComponent(t)}`);
}
