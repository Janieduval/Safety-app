import { prisma } from "@/lib/prisma";

// Notes when something on this site worked or failed (PDFs, photo uploads,
// notifications), so the control centre can show "Is it working?".
// Never throws: recording must never break the thing being recorded.
export async function recordEvent(kind: "pdf" | "photo" | "push", ok: boolean, detail?: string, count = 1) {
  try {
    await prisma.appEvent.create({
      data: { kind, ok, count, detail: detail ? detail.slice(0, 300) : null },
    });
  } catch {
    // ignore
  }
}

// Turns an error into one short readable line.
export function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? "Unknown error");
  return msg.replace(/\s+/g, " ").trim().slice(0, 200) || "Unknown error";
}
