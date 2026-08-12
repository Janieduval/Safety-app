import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  cookies().delete("supervisor_session");
  return NextResponse.redirect(new URL("/supervisor/login", req.url));
}
