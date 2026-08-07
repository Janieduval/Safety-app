import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canSubmitWorkerAssessment } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { workerId, signatureData } = body as {
    workerId: string;
    signatureData: string;
  };

  if (!workerId || !signatureData) {
    return NextResponse.json(
      { error: "workerId and signatureData are required" },
      { status: 400 }
    );
  }

  const assessment = await prisma.assessment.findUnique({ where: { id: params.id } });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }
  if (assessment.status !== "changes_required") {
    return NextResponse.json(
      { error: "This assessment is not awaiting changes." },
      { status: 409 }
    );
  }

  const result = await canSubmitWorkerAssessment(params.id);
  const blockingErrors = result.errors.filter(
    (e) => !e.startsWith("__REQUIRES_SUPERVISOR_REVIEW__")
  );
  if (blockingErrors.length > 0) {
    return NextResponse.json({ ok: false, errors: blockingErrors }, { status: 422 });
  }

  await prisma.changeAcknowledgment.create({
    data: {
      assessmentId: params.id,
      versionAtAck: assessment.version + 1,
      workerId,
      signatureData,
    },
  });

  const updated = await prisma.assessment.update({
    where: { id: params.id },
    data: {
      status: "awaiting_supervisor_review",
      version: { increment: 1 },
    },
  });

  await prisma.auditLog.create({
    data: {
      assessmentId: params.id,
      entityType: "Assessment",
      entityId: params.id,
      action: "resubmitted_after_changes",
      actorName: workerId,
      beforeJson: JSON.stringify({ status: "changes_required", version: assessment.version }),
      afterJson: JSON.stringify({ status: updated.status, version: updated.version }),
    },
  });

  return NextResponse.json({ ok: true, assessment: updated });
}
