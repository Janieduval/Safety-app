import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isControlCentre, readTicket } from "@/lib/control/core";
import { createAdminSessionToken } from "@/lib/adminSession";

// "Open admin" from the control centre lands here with a short-lived signed
// ticket. If it's genuine, the owner is logged into this site's admin.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (isControlCentre()) return NextResponse.json({ error: "Not a JSAFE site." }, { status: 404 });
  const ticket = readTicket(req.nextUrl.searchParams.get("t"));
  if (!ticket || ticket.purpose !== "open-admin") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const to = typeof ticket.to === "string" && ticket.to.startsWith("/admin") ? ticket.to : "/admin/dashboard";
  const email = (process.env.OWNER_ADMIN_EMAIL ?? "").trim() || "owner@control-centre";
  const token = await createAdminSessionToken(email);
  cookies().set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  // A tiny page that moves on to the admin. (Going on from this site's own
  // page means the browser sends the new login cookie.)
  const safe = to.replace(/[^A-Za-z0-9/_\-?=&.]/g, "");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${safe}"><title>Opening admin…</title></head><body style="font-family:system-ui;padding:24px">Opening admin… <a href="${safe}">Continue</a><script>location.replace(${JSON.stringify(safe)})</script></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
