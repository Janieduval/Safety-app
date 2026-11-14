import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isControlOwner } from "@/lib/control/core";

// Control centre: add a company (POST) or change its name or colour (PATCH).

export const dynamic = "force-dynamic";

const COLORS = ["#047857", "#2563eb", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#4b5563"];
const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 80) : "");

export async function POST(req: NextRequest) {
  if (!(await isControlOwner())) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = clean(body.name);
  if (!name) return NextResponse.json({ error: "Type the company name." }, { status: 400 });
  const exists = await prisma.ccCompany.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (exists) return NextResponse.json({ error: "That company is already there." }, { status: 400 });
  const color = COLORS.includes(body.color) ? body.color : COLORS[(await prisma.ccCompany.count()) % COLORS.length];
  const company = await prisma.ccCompany.create({ data: { name, color } });
  return NextResponse.json({ company });
}

export async function PATCH(req: NextRequest) {
  if (!(await isControlOwner())) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const data: { name?: string; color?: string } = {};
  if (body.name !== undefined) {
    const name = clean(body.name);
    if (!name) return NextResponse.json({ error: "Type the company name." }, { status: 400 });
    data.name = name;
  }
  if (COLORS.includes(body.color)) data.color = body.color;
  try {
    const company = await prisma.ccCompany.update({ where: { id }, data });
    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: "Couldn't save. Is that name already used?" }, { status: 400 });
  }
}
