import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STEP1_QUESTIONS, HAZARD_QUESTIONS, FINAL_DECLARATIONS } from "@/lib/constants";

// Create a new draft assessment for a project, pre-populated with empty
// (unanswered) rows for every question so nothing is ever silently treated
// as "No" or "not applicable".
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, completedByWorkerId } = body as {
    projectId: string;
    completedByWorkerId: string;
  };

  if (!projectId || !completedByWorkerId) {
    return NextResponse.json(
      { error: "projectId and completedByWorkerId are required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const assessment = await prisma.assessment.create({
    data: {
      projectId,
      completedByWorkerId,
      dateTime: new Date(),
      status: "draft",
      step1Responses: {
        create: STEP1_QUESTIONS.map((q) => ({ questionKey: q.key })),
      },
      hazardResponses: {
        create: HAZARD_QUESTIONS.map((q) => ({ questionKey: q.key })),
      },
      declarations: {
        create: FINAL_DECLARATIONS.map((d) => ({ declarationKey: d.key })),
      },
      accessCheck: { create: {} },
      newHazardFlag: { create: {} },
    },
  });

  await prisma.auditLog.create({
    data: {
      assessmentId: assessment.id,
      entityType: "Assessment",
      entityId: assessment.id,
      action: "created_draft",
      actorName: completedByWorkerId,
      afterJson: JSON.stringify({ status: "draft" }),
    },
  });

  return NextResponse.json({ assessment });
}
