import { NextResponse } from "next/server";
import { runInboundSimulation, runOutboundSimulation } from "@/lib/simulate";
import { getTenant, newId, saveSession } from "@/lib/store";
import type { Session } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    tenantSlug?: string;
    direction?: "inbound" | "outbound";
    leadId?: string;
  };
  const tenant = getTenant(body.tenantSlug ?? "");
  if (!tenant) return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });

  const lead = body.leadId ? tenant.leads.find((l) => l.id === body.leadId) : undefined;
  const direction = body.direction ?? "inbound";

  const session: Session = {
    id: newId("sess"),
    tenantSlug: tenant.slug,
    direction,
    status: "ringing",
    language: lead?.language ?? tenant.languages.primary,
    callerName: lead?.name ?? (direction === "inbound" ? "Inbound caller" : "Unknown"),
    subject:
      lead?.reason ??
      (direction === "inbound"
        ? tenant.vertical === "insurance"
          ? "Inbound claim"
          : "Inbound line"
        : "Outbound outreach"),
    leadId: lead?.id,
    fields: {},
    transcript: [],
    pendingWhisper: null,
    pendingLanguage: null,
    createdAt: new Date().toISOString(),
    endedAt: null,
  };

  saveSession(session, "session.created");

  if (direction === "outbound") {
    void runOutboundSimulation(session.id);
  } else {
    void runInboundSimulation(session.id);
  }

  return NextResponse.json({ session });
}
