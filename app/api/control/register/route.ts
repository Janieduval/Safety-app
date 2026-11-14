import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isControlCentre, keyMatches } from "@/lib/control/core";

// Control centre: a JSAFE site introduces itself here. It shows up under its
// company straight away (the company is created if it's new).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  if (!isControlCentre()) return NextResponse.json({ error: "Not the control centre." }, { status: 404 });
  if (!keyMatches(req.headers.get("x-control-key"))) {
    return NextResponse.json({ error: "Wrong control centre key. Check CONTROL_CENTRE_KEY on the site." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  let url = clean(body.url, 300).replace(/\/+$/, "");
  // https only (plain http just for testing on this computer).
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(url) && !/^http:\/\/localhost:\d+$/i.test(url)) {
    return NextResponse.json({ error: "The site's address looks wrong." }, { status: 400 });
  }
  url = url.toLowerCase();

  // Find or create the company by name (not case-sensitive).
  let companyId: string | undefined;
  let companyName: string | null = null;
  const companyRaw = clean(body.company, 80);
  if (companyRaw) {
    const existing = await prisma.ccCompany.findFirst({ where: { name: { equals: companyRaw, mode: "insensitive" } } });
    const company = existing ?? (await prisma.ccCompany.create({ data: { name: companyRaw } }));
    companyId = company.id;
    companyName = company.name;
  }

  const data = {
    name: clean(body.name, 120) || "New project",
    address: clean(body.address, 200) || null,
    contractor: clean(body.contractor, 120) || null,
    slug: clean(body.slug, 80) || null,
    lastSeenAt: new Date(),
    ...(companyId ? { companyId } : {}),
  };
  const site = await prisma.ccSite.upsert({ where: { url }, create: { url, ...data }, update: data });

  if (!companyName && site.companyId) {
    companyName = (await prisma.ccCompany.findUnique({ where: { id: site.companyId } }))?.name ?? null;
  }
  return NextResponse.json({ ok: true, id: site.id, company: companyName });
}
