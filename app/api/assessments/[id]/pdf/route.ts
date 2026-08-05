import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import AssessmentPdfDocument from "@/lib/pdf/AssessmentPdfDocument";
import React from "react";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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
      hazardResponses: { include: { cards: true } },
      declarations: true,
      newHazardFlag: true,
      signOns: { include: { worker: true }, orderBy: { signedAt: "asc" } },
      supervisorReview: { include: { supervisor: true } },
      reassessments: true,
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    React.createElement(AssessmentPdfDocument, { assessment }) as any
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="assessment-${assessment.id}.pdf"`,
    },
  });
}
