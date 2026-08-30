import { NextResponse } from "next/server";
import { ensureStore, getTenant, upsertTenant } from "@/lib/store";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

const EXPERT = process.env.EXPERT_URL ?? "http://127.0.0.1:18766";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  await ensureStore();
  const { slug } = await ctx.params;
  const tenant = getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as { leadId?: string; phone?: string; name?: string; reason?: string };
  const lead = tenant.leads.find((l) => l.id === body.leadId) ?? null;
  const phone = (lead?.phone || body.phone || "").trim();
  if (!phone) {
    return NextResponse.json({ error: "Lead needs a phone number." }, { status: 400 });
  }
  const fromNumber = (tenant.outboundFromNumber || tenant.inboundPhone || process.env.GUAVA_AGENT_NUMBER || "").trim();
  if (!fromNumber) {
    return NextResponse.json(
      { error: "Paste the Guava dashboard number on the Line tab (inbound / from number)." },
      { status: 400 },
    );
  }

  if (lead) {
    const leads: Lead[] = tenant.leads.map((l) => (l.id === lead.id ? { ...l, status: "dialing" } : l));
    upsertTenant({
      ...tenant,
      leads,
      pendingCall: { direction: "outbound", leadId: lead.id },
    });
  } else {
    upsertTenant({
      ...tenant,
      pendingCall: { direction: "outbound" },
    });
  }

  try {
    const res = await fetch(`${EXPERT}/dial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        leadId: lead?.id,
        fromNumber,
        toNumber: phone,
        contactName: lead?.name || body.name || "Contact",
        reason: lead?.reason || body.reason || "",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Expert could not place the call." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, tenant: getTenant(slug) });
  } catch {
    return NextResponse.json({ error: "Expert is not running. Start expert/main.py." }, { status: 503 });
  }
}
