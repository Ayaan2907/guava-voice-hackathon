import { NextResponse } from "next/server";
import { currentOrg } from "@/lib/auth";
import { completeOnboard } from "@/lib/onboard";
import { listSessions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const org = await currentOrg();
  if (!org) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const sessions = listSessions(org.slug);
  const onboard = sessions.find((s) => s.subject === "Onboarding intake") ?? sessions[0];
  const tenant = completeOnboard(org.slug, onboard?.fields ?? {});
  if (!tenant) return NextResponse.json({ error: "Unknown org." }, { status: 404 });
  return NextResponse.json({ tenant });
}
