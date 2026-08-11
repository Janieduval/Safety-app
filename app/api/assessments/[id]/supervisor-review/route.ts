import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const {
    supervisorId,
    checklist,
    comments,
    additionalControls,
    decision,
    signatureData,
  } = body as {
    supervisorId: string;
    checklist: Record<string, boolean>;
    comments?: string;
    additionalControls?: string;
    decision: "approved" | "changes_required";
    signatureData: string;
  };
  if (!supervisorId || !signatureData || !decision) {
    return NextResponse.json(
      { error: "supervisorId, signatureData and decision are required" },
      { status: 400 }
    );
  }
  const assessment = await prisma.assessment.findUnique({ where: { id: params.id } });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }
  if (assessment.status !== "awaiting_supervisor_review") {
    return NextResponse.json(
      { error: "This assessment is not awaiting supervisor review." },
      { status: 409 }
    );
  }
  const requiredChecklistKeys = [
    "taskUnderstood",
    "hazardsAppropriate",
    "controlsSuitable",
    "workersCompetentFit",
    "additionalHazardsDiscussed",
    "stopWorkResolved",
    "highRiskReviewed",
    "permitsConfirmed",
    "commentsDiscussed",
  ];
  const missing = requiredChecklistKeys.filter((k) => !checklist?.[k]);
  if (decision === "approved" && missing.length > 0) {
    return NextResponse.json(
      {
        error:
          "All supervisor checklist items must be confirmed before approving.",
        missing,
      },
      { status: 422 }
    );
  }
  await prisma.supervisorReview.upsert({
    where: {
      assessmentId_version: { assessmentId: params.id, version: assessment.version },
    },
    update: {
      supervisorId,
      taskUnderstood: !!checklist.taskUnderstood,
      hazardsAppropriate: !!checklist.hazardsAppropriate,
      controlsSuitable: !!checklist.controlsSuitable,
      workersCompetentFit: !!checklist.workersCompetentFit,
      additionalHazardsDiscussed: !!checklist.additionalHazardsDiscussed,
      stopWorkResolved: !!checklist.stopWorkResolved,
      highRiskReviewed: !!checklist.highRiskReviewed,
      permitsConfirmed: !!checklist.permitsConfirmed,
      comments,
      additionalControls,
      decision,
      signatureData,
      reviewedAt: new Date(),
    },
    create: {
      assessmentId: params.id,
      version: assessment.version,
      supervisorId,
      taskUnderstood: !!checklist.taskUnderstood,
      hazardsAppropriate: !!checklist.hazardsAppropriate,
      controlsSuitable: !!checklist.controlsSuitable,
      workersCompetentFit: !!checklist.workersCompetentFit,
      additionalHazardsDiscussed: !!checklist.additionalHazardsDiscussed,
      stopWorkResolved: !!checklist.stopWorkResolved,
      highRiskReviewed: !!checklist.highRiskReviewed,
      permitsConfirmed: !!checklist.permitsConfirmed,
      comments,
      additionalControls,
      decision,
      signatureData,
    },
  });
  const newStatus = decision === "approved" ? "approved" : "changes_required";
  const updated = await prisma.assessment.update({
    where: { id: params.id },
    data: { status: newStatus },
  });
  await prisma.auditLog.create({
    data: {
      assessmentId: params.id,
      entityType: "Assessment",
      entityId: params.id,
      action: "supervisor_review",
      actorName: supervisorId,
      beforeJson: JSON.stringify({ status: "awaiting_supervisor_review" }),
      afterJson: JSON.stringify({ status: newStatus, decision, comments, version: assessment.version }),
    },
  });
  return NextResponse.json({ ok: true, assessment: updated });
}
