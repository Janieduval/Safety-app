import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import JSZip from "jszip";

function sydneyDateString(d: Date | string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(d));
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

  // Reuses the existing, already-working PDF endpoint for each assessment
  // rather than duplicating PDF-generation logic here — but generates all
  // of them at once (not one after another), since waiting for each PDF
  // to finish before starting the next made this painfully slow on any
  // day with more than a couple of assessments.
  const results = await Promise.all(
    matching.map(async (a) => {
      const workerName = cleanText(a.completedByWorker?.name) || "Unknown worker";
      const teamName = cleanText(a.team?.label ?? a.otherTeamText) || "No team";
      const filename = `${toSafeFilenamePart(workerName)} - ${toSafeFilenamePart(
        teamName
      )} - ${targetDate}.pdf`;

      try {
        const pdfRes = await fetch(`${baseUrl}/api/assessments/${a.id}/pdf`);
        if (!pdfRes.ok) return null; // skip any single failure rather than failing the whole zip
        const buffer = await pdfRes.arrayBuffer();
        return { filename, buffer };
      } catch {
        return null;
      }
    })
  );

  for (const r of results) {
    if (r) zip.file(r.filename, r.buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${targetDate}.zip"`,
    },
  });
}
