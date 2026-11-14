import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectToControlCentre } from "@/lib/control/connect";

// The workers' home-screen app ("JSAFE App"). It opens this site's own worker
// page, so each copy of JSAFE (Blind Creek, or another project) opens the
// right project instead of a fixed address.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Every page asks for this, so it's also when the site checks in with the
  // control centre (at most every 30 minutes; skipped if not set up).
  await connectToControlCentre(new URL(req.url).origin).catch(() => {});

  let slug = "blind-creek-solar-farm";
  try {
    const project = await prisma.project.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { qrSlug: true },
    });
    if (project?.qrSlug) slug = project.qrSlug;
  } catch {
    // Database not reachable: fall back to the default page.
  }

  const manifest = {
    id: "/",
    name: "JSAFE App",
    short_name: "JSAFE App",
    description: "Daily Task Safety Awareness pre-task risk assessments",
    start_url: `/${slug}`,
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#047857",
    icons: [
      { src: "/icon-192_2.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icon-512_1.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" },
  });
}
