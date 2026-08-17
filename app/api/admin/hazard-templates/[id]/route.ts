import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await req.json();
  const { description, controls, initialRisk, residualRisk, needsReview, active } = body as {
    description?: string;
    controls?: string;
    initialRisk?: string;
    residualRisk?: string;
    needsReview?: boolean;
    active?: boolean;
  };

  const template = await prisma.hazardTemplate.update({
    where: { id: params.id },
    data: {
      description,
      controls,
      initialRisk: initialRisk as any,
      residualRisk: residualRisk as any,
      needsReview,
      active,
    },
  });

  return NextResponse.json({ template });
}
