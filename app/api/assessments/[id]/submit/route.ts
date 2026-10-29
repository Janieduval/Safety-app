import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canSubmitWorkerAssessment } from "@/lib/validation";
import { notifySupervisorsToReview } from "@/lib/push";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await canSubmitWorkerAssessment(params.id);

  const blockingErrors = result.errors.filter(
    (e) => !e.startsWith("__REQUIRES_SUPERVISOR_REVIEW__")
  );

  if (blockingErrors.length > 0) {
    return NextResponse.json(
      { ok: false, errors: blockingErrors },
      { status: 422 }
    );
  }

  const before = await prisma.assessment.findUnique({ where: { id: params.id } });

  const updated = await prisma.assessment.update({
    where: { id: params.id },
    data: { status: "awaiting_supervisor_review" },
  });

  await prisma.auditLog.create({
    data: {
      assessmentId: params.id,
      entityType: "Assessment",
      entityId: params.id,
      action: "status_change",
      actorName: "worker",
      beforeJson: JSON.stringify({ status: before?.status }),
      afterJson: JSON.stringify({ status: updated.status }),
    },
  });

  // Let the supervisors of this team know (only the first time it arrives).
  if (before?.status !== "awaiting_supervisor_review") {
    await notifySupervisorsToReview(params.id, "new");
  }

  return NextResponse.json({ ok: true, assessment: updated });
}
