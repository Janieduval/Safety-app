import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Always read the database when asked. Without this, Next.js saves the answer
// once when the site is built — and a brand-new site is built before its
// project exists, so it would always answer "no projects".
export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, qrSlug: true },
  });
  return NextResponse.json({ projects });
}
