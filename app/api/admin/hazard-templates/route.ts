import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

export async function GET(req: NextRequest) {
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const templates = await prisma.hazardTemplate.findMany({
    where: { active: true },
    include: { team: true, createdByWorker: true },
    orderBy: [{ needsReview: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ templates });
}
