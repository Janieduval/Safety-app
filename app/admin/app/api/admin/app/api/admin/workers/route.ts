import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  const workers = await prisma.worker.findMany({
    where: { projectId },
    orderBy: [{ archived: "asc" }, { active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ workers });
}

export async function POST(req: NextRequest) {
  const { projectId, name } = await req.json();
  if (!projectId || !name?.trim()) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 });
  }
  const worker = await prisma.worker.create({
    data: { projectId, name: name.trim() },
  });
  return NextResponse.json({ worker });
}
