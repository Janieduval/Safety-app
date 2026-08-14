import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const before = await prisma.assessment.findUnique({ where: { id: params.id } });
  if (!before) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const updated = await prisma.assessment.update({
    where: { id: params.id },
    data: { status: "archived" },
  });

  await prisma.auditLog.create({
    data: {
      assessmentId: params.id,
      entityType: "Assessment",
      entityId: params.id,
      action: "archived",
      actorName: adminEmail,
      beforeJson: JSON.stringify({ status: before.status }),
      afterJson: JSON.stringify({ status: "archived" }),
    },
  });

  return NextResponse.json({ ok: true, assessment: updated });
}
