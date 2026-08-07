import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const assessments = await prisma.assessment.findMany({
    where: {
      OR: [{ completedByWorkerId: params.id }, { signOns: { some: { workerId: params.id } } }],
    },
    include: {
      project: true,
      team: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ assessments });
}
