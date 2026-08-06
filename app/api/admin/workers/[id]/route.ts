import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { name, active, archived, needsReview } = body as {
    name?: string;
    active?: boolean;
    archived?: boolean;
    needsReview?: boolean;
  };
  const worker = await prisma.worker.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(archived !== undefined ? { archived } : {}),
      ...(needsReview !== undefined ? { needsReview } : {}),
    },
  });
  return NextResponse.json({ worker });
}
