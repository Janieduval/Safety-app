import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { pin } = await req.json();
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4-6 digits." }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.supervisor.update({
    where: { id: params.id },
    data: { pinHash },
  });

  return NextResponse.json({ ok: true });
}
