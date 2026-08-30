import { NextResponse } from "next/server";
import { currentOrg } from "@/lib/auth";
import { completeOnboard } from "@/lib/onboard";
import { ensureStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await ensureStore();
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { fields?: Record<string, string> };
  const tenant = completeOnboard(org.slug, body.fields ?? {});
  if (!tenant) return NextResponse.json({ error: "Unknown org." }, { status: 404 });
  return NextResponse.json({ tenant });
}
