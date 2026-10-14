import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_PER_KIND = 3;
const MAX_BYTES = 4 * 1024 * 1024; // photos are shrunk on the phone first, so this is generous
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EDITABLE_STATUSES = ["draft", "changes_required"];

// Finds the card and checks its assessment can still be changed.
async function getEditableCard(hazardCardId: string) {
  const card = await prisma.hazardCard.findUnique({
    where: { id: hazardCardId },
    include: {
      hazardResponse: {
        include: { assessment: { select: { id: true, status: true } } },
      },
    },
  });
  if (!card) {
    return { error: "Hazard card not found.", status: 404 };
  }
  const assessment = card.hazardResponse.assessment;
  if (!EDITABLE_STATUSES.includes(assessment.status)) {
    return { error: "This assessment can no longer be edited.", status: 403 };
  }
  return { assessmentId: assessment.id };
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const hazardCardId = String(form.get("hazardCardId") ?? "");
  const kind = String(form.get("kind") ?? "");

  if (!(file instanceof File) || !hazardCardId || (kind !== "hazard" && kind !== "control")) {
    return NextResponse.json({ error: "Missing photo, card or photo type." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP photos can be added." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
  }

  const found = await getEditableCard(hazardCardId);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  const existingCount = await prisma.hazardPhoto.count({ where: { hazardCardId, kind } });
  if (existingCount >= MAX_PER_KIND) {
    return NextResponse.json(
      { error: `Up to ${MAX_PER_KIND} ${kind} photos can be added to each card.` },
      { status: 400 }
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";

  try {
    const blob = await put(
      `hazard-photos/${found.assessmentId}/${hazardCardId}-${kind}.${ext}`,
      file,
      { access: "public", addRandomSuffix: true, contentType: file.type }
    );

    const photo = await prisma.hazardPhoto.create({
      data: { hazardCardId, kind, url: blob.url, pathname: blob.pathname },
    });

    return NextResponse.json({ photo });
  } catch (e) {
    console.error("Hazard photo upload failed", e);
    return NextResponse.json(
      { error: "Couldn't save the photo right now. Try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing photo id." }, { status: 400 });
  }

  const photo = await prisma.hazardPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const found = await getEditableCard(photo.hazardCardId);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  await prisma.hazardPhoto.delete({ where: { id } });

  // Remove the file too. If this fails, the record is already gone,
  // so the photo no longer shows anywhere in the app.
  try {
    await del(photo.url);
  } catch (e) {
    console.error("Blob delete failed", e);
  }

  return NextResponse.json({ ok: true });
}
