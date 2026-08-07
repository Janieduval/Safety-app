import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { projectId, name } = await req.json();
  if (!projectId || !name?.trim()) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 });
  }
  const trimmedName = name.trim();

  // Avoid creating a duplicate if someone with this exact name already exists
  const existing = await prisma.worker.findFirst({
    where: {
      projectId,
      archived: false,
      name: { equals: trimmedName, mode: "insensitive" },
    },
  });
  if (existing) {
    return NextResponse.json({ worker: existing });
  }

  const worker = await prisma.worker.create({
    data: {
      projectId,
      name: trimmedName,
      needsReview: true,
    },
  });
  return NextResponse.json({ worker });
}
