import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { initiatedByWorkerId, whatChanged, newHazards, newControls } = body as {
    initiatedByWorkerId: string;
    whatChanged: string;
    newHazards?: string;
    newControls?: string;
  };

  if (!initiatedByWorkerId || !whatChanged) {
    return NextResponse.json(
      { error: "initiatedByWorkerId and whatChanged are required" },
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

  // Deliberately creates a new linked record rather than mutating the
  // original approved assessment, preserving its approval intact.
  const reassessment = await prisma.reassessment.create({
    data: {
      originalAssessmentId: params.id,
      initiatedByWorkerId,
      whatChanged,
      newHazards: newHazards ?? null,
      newControls: newControls ?? null,
      requiresSupervisorReview: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      assessmentId: params.id,
      entityType: "Reassessment",
      entityId: reassessment.id,
      action: "reassessment_created",
      actorName: initiatedByWorkerId,
      afterJson: JSON.stringify({ whatChanged }),
    },
  });

  return NextResponse.json({ reassessment });
}
