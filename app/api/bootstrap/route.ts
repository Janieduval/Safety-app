import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/prisma/seedData";

// Visit this URL once in a browser after deploying, with ?secret=<BOOTSTRAP_SECRET>
// appended, e.g.:
//   https://your-app.vercel.app/api/bootstrap?secret=xxxxxxxx
//
// It seeds the database (project, teams, SWMS, PPE, permits, sample workers
// and supervisors) and creates the first admin account from the
// ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD environment variables you
// set in Vercel — so no terminal, migration tool, or database client is
// needed on your end at all.
//
// SECURITY: this is meant to be run exactly once. After you've confirmed it
// worked (and logged in at /admin/login), remove BOOTSTRAP_SECRET from your
// Vercel environment variables so this endpoint can no longer be triggered.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.BOOTSTRAP_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "BOOTSTRAP_SECRET is not set on the server. Set it in your hosting provider's environment variables first." },
      { status: 500 }
    );
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: "Invalid or missing secret." }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  const log = await seedDatabase(prisma, {
    adminEmail,
    adminPassword,
  });

  return NextResponse.json({
    ok: true,
    log,
    nextStep: adminEmail
      ? "Go to /admin/login and sign in with ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD, then remove BOOTSTRAP_SECRET from your environment variables."
      : "No ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD were set, so no admin account was created. Add them and revisit this URL to create one.",
  });
}
