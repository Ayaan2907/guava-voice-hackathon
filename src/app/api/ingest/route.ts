import { NextResponse } from "next/server";
import { completeOnboard, onboardReady } from "@/lib/onboard";
import { addLine, ensureStore, getSession, getTenant, newId, patchSession, saveSession } from "@/lib/store";
import type { Session, TranscriptRole } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The Python Expert posts live Guava events here.
 * Shared secret keeps random internet traffic out of the desk.
 */
export async function POST(req: Request) {
  await ensureStore();
  const secret = req.headers.get("x-pact-secret");
  if (secret !== (process.env.PACT_INGEST_SECRET ?? "dev-secret")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    tenantSlug?: string;
    sessionId?: string;
    direction?: "inbound" | "outbound";
    status?: Session["status"];
    callerName?: string;
    subject?: string;
    language?: string;
    kind?: "onboard" | "call";
    taskComplete?: boolean;
    leadId?: string;
    line?: { role: TranscriptRole; text: string; language?: string; translated?: string };
    fields?: Record<string, string>;
  };

  const tenant = getTenant(body.tenantSlug ?? "");
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  let session = body.sessionId ? getSession(body.sessionId) : null;
  if (!session) {
    session = {
      id: body.sessionId ?? newId("sess"),
      tenantSlug: tenant.slug,
      direction: body.direction ?? "inbound",
      status: body.status ?? "live",
      language: body.language ?? tenant.languages.primary,
      callerName: body.callerName ?? "Caller",
      subject: body.subject ?? "Live line",
      leadId: body.leadId,
      fields: {},
      transcript: [],
      pendingWhisper: null,
      pendingLanguage: null,
      createdAt: new Date().toISOString(),
      endedAt: null,
    };
    saveSession(session, "session.created");
  }

  if (body.status) patchSession(session.id, { status: body.status, endedAt: body.status === "ended" ? new Date().toISOString() : session.endedAt });
  if (body.callerName) patchSession(session.id, { callerName: body.callerName });
  if (body.fields) {
    const live = getSession(session.id)!;
    patchSession(session.id, { fields: { ...live.fields, ...body.fields } });
  }
  if (body.line) addLine(session.id, body.line);

  const merged = { ...(getSession(session.id)?.fields ?? {}), ...(body.fields ?? {}) };
  const onboardCall = body.kind === "onboard" || session.subject === "Onboarding intake";
  if (onboardCall && !tenant.onboardComplete && (body.taskComplete || onboardReady(merged))) {
    completeOnboard(tenant.slug, merged);
    addLine(session.id, {
      role: "system",
      text: "Playbook saved from this interview. Inbound and outbound now use these answers.",
    });
  }

  return NextResponse.json({ ok: true, sessionId: session.id });
}
