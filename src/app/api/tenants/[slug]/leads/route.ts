import { NextResponse } from "next/server";
import { ensureStore, getTenant, newId, upsertTenant } from "@/lib/store";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  await ensureStore();
  const { slug } = await ctx.params;
  const tenant = getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as Partial<Lead>;
  const name = (body.name ?? "").trim();
  const reason = (body.reason ?? "").trim();
  if (!name || !reason) {
    return NextResponse.json({ error: "Name and action/reason are required." }, { status: 400 });
  }
  const lead: Lead = {
    id: newId("lead"),
    name,
    phone: (body.phone ?? "").trim(),
    language: body.language === "spanish" || body.language === "french" ? body.language : "english",
    reason,
    context: (body.context ?? "").trim(),
    status: "queued",
  };
  const next = upsertTenant({ ...tenant, leads: [lead, ...tenant.leads] });
  return NextResponse.json({ tenant: next, lead });
}
