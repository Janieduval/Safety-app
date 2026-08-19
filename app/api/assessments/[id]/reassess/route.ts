import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SIGNON_CONFIRMATION_TEXT } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { initiatedByWorkerId, whatChanged, newHazards, newControls, signatureData } = body as {
    initiatedByWorkerId: string;
    whatChanged: string;
    newHazards?: string;
    newControls?: string;
    signatureData: string;
  };
  if (!initiatedByWorkerId || !whatChanged || !signatureData) {
    return NextResponse.json(
      { error: "initiatedByWorkerId, whatChanged and signatureData are required" },
      { status: 400 }
    );
  }
  const original = await prisma.assessment.findUnique({ where: { id: params.id } });
  if (!original) {
    return NextResponse.json({ error: "Original assessment not found" }, { status: 404 });
  }
  if (original.status !== "approved") {
    return NextResponse.json(
      { error: "Only an approved assessment can be reassessed." },
      { status: 409 }
    );
  }

  const newVersion = original.version + 1;

  // Records what changed as a note tied to the new version, bumps the
  // assessment itself to that new version, sends it back for a real
  // supervisor review, and captures the initiator's signature as the
  // primary sign-on for this version — mirroring exactly how a normal
  // "changes required" resubmission already works, so everything else
  // (team sign-on, supervisor review, the copy-link button) just works
  // without needing to know this came from a reassessment specifically.
  const [reassessment, , signOn] = await prisma.$transaction([
    prisma.reassessment.create({
      data: {
        originalAssessmentId: params.id,
        initiatedByWorkerId,
        whatChanged,
        newHazards: newHazards ?? null,
        newControls: newControls ?? null,
        requiresSupervisorReview: true,
      },
    }),
    prisma.assessment.update({
      where: { id: params.id },
      data: { version: newVersion, status: "awaiting_supervisor_review" },
    }),
    prisma.signOn.create({
      data: {
        assessmentId: params.id,
        workerId: initiatedByWorkerId,
        version: newVersion,
        signatureData,
        confirmationText: SIGNON_CONFIRMATION_TEXT,
        isPrimary: true,
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      assessmentId: params.id,
      entityType: "Reassessment",
      entityId: reassessment.id,
      action: "reassessment_created",
      actorName: initiatedByWorkerId,
      afterJson: JSON.stringify({ whatChanged, newVersion }),
    },
  });

  return NextResponse.json({ reassessment, version: newVersion });
}
