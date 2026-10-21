import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";
import { renderToBuffer } from "@react-pdf/renderer";
import AssessmentPdfDocument from "@/lib/pdf/AssessmentPdfDocument";
import React from "react";

export const runtime = "nodejs";

const PHOTO_TIMEOUT_MS = 8000;

// Downloads one photo for the PDF. Returns null if it can't be fetched in
// time or isn't a JPG/PNG, so one bad photo never breaks the whole PDF.
async function fetchPhotoForPdf(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    const format = type.includes("png") ? "png" : type.includes("jpeg") || type.includes("jpg") ? "jpg" : null;
    if (!format) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return { data, format };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Builds a readable file name, e.g. "JSAFE_Janie-Duval_2026-10-21.pdf".
function pdfFileName(assessment: any): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(
    new Date(assessment.dateTime)
  );
  const name = (assessment.completedByWorker?.name ?? "assessment")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `JSAFE_${name || "assessment"}_${date}.pdf`;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      team: true,
      completedByWorker: true,
      step1Responses: true,
      swms: { include: { swmsOption: true } },
      ppe: { include: { ppeOption: true } },
      permits: { include: { permitType: true } },
      accessCheck: true,
      changeEntries: true,
      hazardResponses: { include: { cards: { include: { photos: { orderBy: { createdAt: "asc" } } } } } },
      declarations: true,
      newHazardFlag: true,
      signOns: { include: { worker: true }, orderBy: { signedAt: "asc" } },
      supervisorReviews: { include: { supervisor: true }, orderBy: { version: "asc" } },
      reassessments: true,
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  // Fetch every photo at once, then attach each one to its card as pdfSrc.
  const hazardResponses = await Promise.all(
    assessment.hazardResponses.map(async (r: any) => ({
      ...r,
      cards: await Promise.all(
        r.cards.map(async (c: any) => ({
          ...c,
          photos: await Promise.all(
            (c.photos ?? []).map(async (p: any) => ({
              ...p,
              pdfSrc: await fetchPhotoForPdf(p.url),
            }))
          ),
        }))
      ),
    }))
  );

  const pdfAssessment = { ...assessment, hazardResponses };

  const buffer = await renderToBuffer(
    React.createElement(AssessmentPdfDocument, { assessment: pdfAssessment }) as any
  );

  // Admins and supervisors: the PDF just opens. Workers: it saves as a file.
  // (?view=1 always opens, ?download=1 always saves.)
  const isStaff =
    !!(await verifyAdminSessionToken(cookies().get("admin_session")?.value)) ||
    !!(await verifySupervisorSessionToken(cookies().get("supervisor_session")?.value));
  const mode = req.nextUrl.searchParams;
  const view = mode.get("download") === "1" ? false : mode.get("view") === "1" || isStaff;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // "inline" opens the PDF in the browser; "attachment" saves it as a file.
      "Content-Disposition": `${view ? "inline" : "attachment"}; filename="${pdfFileName(assessment)}"`,
      "Cache-Control": "no-store",
    },
  });
}
