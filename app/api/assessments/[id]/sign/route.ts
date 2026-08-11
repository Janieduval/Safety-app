import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SIGNON_CONFIRMATION_TEXT } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { workerId, signatureData, isPrimary } = body as {
    workerId: string;
    signatureData: string;
    isPrimary?: boolean;
  };
  if (!workerId || !signatureData) {
    return NextResponse.json(
      { error: "workerId and signatureData are required" },
      { status: 400 }
    );
  }
  const assessment = await prisma.assessment.findUnique({ where: { id: params.id } });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }
  const existing = await prisma.signOn.findUnique({
    where: {
      assessmentId_workerId_version: {
        assessmentId: params.id,
        workerId,
        version: assessment.version,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This worker has already signed this version of the assessment." },
      { status: 409 }
    );
  }
  const signOn = await prisma.signOn.create({
    data: {
      assessmentId: params.id,
      workerId,
      version: assessment.version,
      signatureData,
      confirmationText: SIGNON_CONFIRMATION_TEXT,
      isPrimary: !!isPrimary,
    },
  });
  await prisma.auditLog.create({
    data: {
      assessmentId: params.id,
      entityType: "SignOn",
      entityId: signOn.id,
      action: "sign_on",
      actorName: workerId,
      afterJson: JSON.stringify({
        workerId,
        isPrimary: !!isPrimary,
        version: assessment.version,
        signedAt: signOn.signedAt,
      }),
    },
  });
  return NextResponse.json({ signOn });
}
