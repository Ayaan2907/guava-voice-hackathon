import { NextResponse } from "next/server";
import { runInboundSimulation, runOnboardSimulation, runOutboundSimulation } from "@/lib/simulate";
import { findLiveInbound, getTenant, newId, saveSession } from "@/lib/store";
import type { Session } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    tenantSlug?: string;
    direction?: "inbound" | "outbound";
    leadId?: string;
    force?: boolean;
    kind?: "onboard" | "call";
    callerName?: string;
    subject?: string;
  };
  const tenant = getTenant(body.tenantSlug ?? "");
  if (!tenant) return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });

  const kind = body.kind ?? "call";
  const lead = body.leadId ? tenant.leads.find((l) => l.id === body.leadId) : undefined;
  const direction = body.direction ?? (kind === "onboard" ? "inbound" : "inbound");

  if (kind === "call" && direction === "outbound" && !tenant.outboundEnabled) {
    return NextResponse.json({ error: "Outbound is off for this desk." }, { status: 403 });
  }
  if (kind === "call" && direction === "inbound" && !tenant.inboundEnabled && !lead) {
    return NextResponse.json({ error: "Inbound is off for this desk." }, { status: 403 });
  }

  if (kind !== "onboard" && direction === "inbound" && body.force !== true) {
    const live = findLiveInbound(tenant.slug);
    if (live) return NextResponse.json({ session: live, reused: true });
  }

  const session: Session = {
    id: newId("sess"),
    tenantSlug: tenant.slug,
    direction,
    status: "ringing",
    language: lead?.language ?? tenant.languages.primary,
    callerName:
      body.callerName?.trim() ||
      lead?.name ||
      (kind === "onboard" ? "Founder" : direction === "inbound" ? "Inbound caller" : "Web outbound"),
    subject:
      body.subject?.trim() ||
      lead?.reason ||
      (kind === "onboard"
        ? "Onboarding intake"
        : direction === "inbound"
          ? tenant.vertical === "insurance"
            ? "Inbound claim"
            : "Inbound line"
          : "Outbound web call"),
    leadId: lead?.id,
    fields: {},
    transcript: [],
    pendingWhisper: null,
    pendingLanguage: null,
    createdAt: new Date().toISOString(),
    endedAt: null,
  };

  saveSession(session, "session.created");

  if (kind === "onboard") {
    void runOnboardSimulation(session.id);
  } else if (direction === "outbound") {
    void runOutboundSimulation(session.id);
  } else {
    void runInboundSimulation(session.id);
  }

  return NextResponse.json({ session });
}
