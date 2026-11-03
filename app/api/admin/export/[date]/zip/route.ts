import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import JSZip from "jszip";

const TZ = "Australia/Sydney";
const READY_HOUR = 22; // 10pm local time

function sydneyDateString(d: Date | string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
  return fmt.format(new Date(d));
}

function sydneyHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Number(hour);
}

function isDayReady(date: string, now: Date): boolean {
  const today = sydneyDateString(now);
  if (date < today) return true;
  if (date === today) return sydneyHour(now) >= READY_HOUR;
  return false;
}

function cleanText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function toSafeFilenamePart(value: string): string {
  return cleanText(value).replace(/[\\/:*?"<>|]/g, "-");
}

export async function GET(req: NextRequest, { params }: { params: { date: string } }) {
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const targetDate = params.date;

  // Today's records stay locked until 10pm so supervisor reviews
  // done during the day are captured in the export.
  if (!isDayReady(targetDate, new Date())) {
    return NextResponse.json(
      { error: "This day can be exported from 10pm, once supervisor reviews are done." },
      { status: 403 }
    );
  }

  const target = new Date(targetDate + "T00:00:00Z");
  const since = new Date(target);
  since.setUTCDate(since.getUTCDate() - 1);
  const until = new Date(target);
  until.setUTCDate(until.getUTCDate() + 2);

  const candidates = await prisma.assessment.findMany({
    where: { dateTime: { gte: since, lte: until } },
    include: { team: true, completedByWorker: true },
  });

  const matching = candidates.filter((a) => sydneyDateString(a.dateTime) === targetDate);

  if (matching.length === 0) {
    return NextResponse.json({ error: "No assessments found for this date." }, { status: 404 });
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const zip = new JSZip();

  // Reuses the existing PDF endpoint for each assessment, all at once,
  // so PDFs reflect the latest data (including supervisor reviews)
  // at the moment of download.
  const results = await Promise.all(
    matching.map(async (a) => {
      const workerName = cleanText(a.completedByWorker?.name) || "Unknown worker";
      const teamName = cleanText(a.team?.label ?? a.otherTeamText) || "No team";
      const baseName = `${toSafeFilenamePart(workerName)} - ${toSafeFilenamePart(
        teamName
      )} - ${targetDate}`;

      try {
        const pdfRes = await fetch(`${baseUrl}/api/assessments/${a.id}/pdf`, {
          cache: "no-store",
        });
        if (!pdfRes.ok) return null; // skip any single failure rather than failing the whole zip
        const buffer = await pdfRes.arrayBuffer();
        return { baseName, buffer };
      } catch {
        return null;
      }
    })
  );

  // Give duplicate names "(2)", "(3)"... so two Take 5s by the same
  // worker and team on the same day don't overwrite each other.
  const used: Record<string, number> = {};
  for (const r of results) {
    if (!r) continue;
    used[r.baseName] = (used[r.baseName] ?? 0) + 1;
    const n = used[r.baseName];
    const filename = n === 1 ? `${r.baseName}.pdf` : `${r.baseName} (${n}).pdf`;
    zip.file(filename, r.buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${targetDate}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
