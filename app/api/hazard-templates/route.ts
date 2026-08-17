import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called when a worker checks "Save this for next time" on a hazard card.
// No auth required — matches the same pattern as quick-adding a new
// worker, since this is used on-site directly by workers. New entries are
// visible to teammates immediately, flagged needsReview for an admin to
// check over later (same governance as new workers).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    teamId,
    questionKey,
    description,
    controls,
    initialRisk,
    residualRisk,
    createdByWorkerId,
  } = body as {
    teamId: string;
    questionKey: string;
    description: string;
    controls: string;
    initialRisk: string;
    residualRisk: string;
    createdByWorkerId?: string;
  };

  if (!teamId || !questionKey || !description?.trim() || !controls?.trim()) {
    return NextResponse.json(
      { error: "teamId, questionKey, description and controls are required" },
      { status: 400 }
    );
  }

  const trimmedDescription = description.trim();
  const trimmedControls = controls.trim();

  // Avoid piling up near-identical duplicates: if this team already has a
  // saved answer with the exact same wording for this hazard question,
  // refresh its controls/risk rather than creating a new entry.
  const existing = await prisma.hazardTemplate.findFirst({
    where: {
      teamId,
      questionKey,
      active: true,
      description: { equals: trimmedDescription, mode: "insensitive" },
    },
  });

  let template;
  if (existing) {
    template = await prisma.hazardTemplate.update({
      where: { id: existing.id },
      data: {
        controls: trimmedControls,
        initialRisk: (initialRisk as any) ?? existing.initialRisk,
        residualRisk: (residualRisk as any) ?? existing.residualRisk,
      },
    });
  } else {
    template = await prisma.hazardTemplate.create({
      data: {
        teamId,
        questionKey,
        description: trimmedDescription,
        controls: trimmedControls,
        initialRisk: (initialRisk as any) ?? "low",
        residualRisk: (residualRisk as any) ?? "low",
        createdByWorkerId: createdByWorkerId ?? null,
      },
    });
  }

  return NextResponse.json({ template, updated: !!existing });
}
