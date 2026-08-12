import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  const supervisors = await prisma.supervisor.findMany({
    where: { projectId },
    orderBy: [{ archived: "asc" }, { active: "desc" }, { name: "asc" }],
  });
  const withHasPin = supervisors.map(({ pinHash, ...s }) => ({
    ...s,
    hasPin: !!pinHash,
  }));
  return NextResponse.json({ supervisors: withHasPin });
}

export async function POST(req: NextRequest) {
  const { projectId, name } = await req.json();
  if (!projectId || !name?.trim()) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 });
  }
  const supervisor = await prisma.supervisor.create({
    data: { projectId, name: name.trim() },
  });
  return NextResponse.json({ supervisor });
}
