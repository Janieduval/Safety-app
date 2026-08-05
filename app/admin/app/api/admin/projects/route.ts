import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, qrSlug: true },
  });
  return NextResponse.json({ projects });
}
