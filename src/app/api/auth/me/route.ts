import { NextResponse } from "next/server";
import { currentOrg } from "@/lib/auth";
import { ensureStore, getTenant } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureStore();
  const org = await currentOrg();
  if (!org) return NextResponse.json({ user: null });
  const tenant = getTenant(org.slug);
  return NextResponse.json({
    user: { email: org.user.email, orgSlug: org.slug },
    tenant,
  });
}
