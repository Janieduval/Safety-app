import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { controlKey, isControlCentre, isControlOwner, keyMatches } from "@/lib/control/core";

// Changing a suggestion's status, note, or deleting it. Only from the control
// centre. On the control centre, the owner's change is passed on to the site.
// On a JSAFE site, it's applied when it comes with the shared key.
// PATCH { siteId?, id, status?, adminNote? }   DELETE { siteId?, id }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES = ["new", "planned", "done", "not_doing"];

async function handle(req: NextRequest, method: "PATCH" | "DELETE") {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing suggestion." }, { status: 400 });

  // ----- Control centre: pass it on to the site -----
  if (isControlCentre()) {
    if (!(await isControlOwner())) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    const site = await prisma.ccSite.findUnique({ where: { id: typeof body.siteId === "string" ? body.siteId : "" } });
    if (!site) return NextResponse.json({ error: "Site not found." }, { status: 404 });
    try {
      const res = await fetch(`${site.url}/api/control/suggestions`, {
        method,
        headers: { "Content-Type": "application/json", "x-control-key": controlKey() },
        body: JSON.stringify({ id, status: body.status, adminNote: body.adminNote }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 && !data.error) {
        return NextResponse.json({ error: `${site.name} needs the latest update first.` }, { status: 400 });
      }
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ error: `Couldn't reach ${site.name}. Try again.` }, { status: 502 });
    }
  }

  // ----- JSAFE site: apply it -----
  if (!keyMatches(req.headers.get("x-control-key"))) {
    return NextResponse.json({ error: "Wrong control centre key." }, { status: 401 });
  }
  if (method === "DELETE") {
    await prisma.suggestion.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  const data: { status?: string; adminNote?: string | null } = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    data.status = body.status;
  }
  if (body.adminNote !== undefined) {
    const note = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 1000) : "";
    data.adminNote = note || null;
  }
  try {
    await prisma.suggestion.update({ where: { id }, data });
  } catch {
    return NextResponse.json({ error: "That suggestion no longer exists." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  return handle(req, "PATCH");
}

export async function DELETE(req: NextRequest) {
  return handle(req, "DELETE");
}
