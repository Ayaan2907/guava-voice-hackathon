import { NextResponse } from "next/server";
import { demoPasswordOk, setSessionCookie } from "@/lib/auth";
import { getTenant, getUserByEmail } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  }
  if (!demoPasswordOk(email, password)) {
    return NextResponse.json({ error: "Unknown email or password." }, { status: 401 });
  }
  const user = getUserByEmail(email)!;
  const tenant = getTenant(user.orgSlug);
  await setSessionCookie(user.email, user.orgSlug);
  return NextResponse.json({
    slug: user.orgSlug,
    onboardComplete: tenant?.onboardComplete ?? true,
  });
}
