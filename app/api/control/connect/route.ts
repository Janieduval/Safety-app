import { NextRequest, NextResponse } from "next/server";
import { connectToControlCentre } from "@/lib/control/connect";

// Open this in a browser (e.g. https://jsafeyancobess.vercel.app/api/control/connect)
// to connect this site to the control centre straight away.
// Sites also connect by themselves; this is just the "do it now" button.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const result = await connectToControlCentre(req.nextUrl.origin, true);
  const colour = result.ok ? "#047857" : "#b91c1c";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>JSAFE · Control centre</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f5f4;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px">
<div style="background:#fff;border-radius:20px;padding:28px;max-width:420px;width:100%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08)">
<div style="width:56px;height:56px;border-radius:50%;margin:0 auto;background:${result.ok ? "#d1fae5" : "#fee2e2"};color:${colour};font-size:28px;font-weight:800;line-height:56px">${result.ok ? "✓" : "!"}</div>
<h1 style="font-size:20px;margin:14px 0 6px">${result.ok ? "Connected" : "Not connected yet"}</h1>
<p style="color:#525252;margin:0;font-size:15px">${result.message.replace(/</g, "&lt;")}</p>
</div></body></html>`;
  return new NextResponse(html, { status: result.ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
