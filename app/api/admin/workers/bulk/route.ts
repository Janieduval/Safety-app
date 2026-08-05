import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { projectId, names } = await req.json();
  if (!projectId || !Array.isArray(names) || names.length === 0) {
    return NextResponse.json(
      { error: "projectId and a non-empty names array are required" },
      { status: 400 }
    );
  }

  const cleanedNames = Array.from(
    new Set(
      names
        .map((n: unknown) => (typeof n === "string" ? n.trim() : ""))
        .filter((n: string) => n.length > 0)
    )
  );

  const existing = await prisma.worker.findMany({
    where: { projectId, name: { in: cleanedNames } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((w) => w.name));
  const toCreate = cleanedNames.filter((n) => !existingNames.has(n));

  if (toCreate.length > 0) {
    await prisma.worker.createMany({
      data: toCreate.map((name) => ({ projectId, name })),
    });
  }

  return NextResponse.json({
    created: toCreate.length,
    skippedAsDuplicates: cleanedNames.length - toCreate.length,
  });
}
