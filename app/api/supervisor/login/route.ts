import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createSupervisorSessionToken } from "@/lib/supervisorSession";

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json();
  if (!name?.trim() || !pin) {
    return NextResponse.json({ error: "Name and PIN required" }, { status: 400 });
  }

  const supervisor = await prisma.supervisor.findFirst({
    where: { name: name.trim(), active: true, archived: false },
  });

  if (!supervisor || !supervisor.pinHash) {
    return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
  }

  const valid = await bcrypt.compare(pin, supervisor.pinHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
  }

  const token = await createSupervisorSessionToken(supervisor.id);
  cookies().set("supervisor_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    // no maxAge -> session cookie, cleared when the browser closes
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
