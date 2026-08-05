import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { name, active, archived } = body as {
    name?: string;
    active?: boolean;
    archived?: boolean;
  };

  const supervisor = await prisma.supervisor.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(archived !== undefined ? { archived } : {}),
    },
  });

  return NextResponse.json({ supervisor });
}
