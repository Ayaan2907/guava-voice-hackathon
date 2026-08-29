import { addLine, getSession, patchSession } from "@/lib/store";
import { publish } from "@/lib/bus";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EXPERT = process.env.EXPERT_URL ?? "http://127.0.0.1:18766";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Empty whisper" }, { status: 400 });

  addLine(id, { role: "operator", text });
  patchSession(id, { pendingWhisper: text, status: session.status === "live" ? "escalated" : session.status });
  publish({
    type: "whisper.sent",
    tenantSlug: session.tenantSlug,
    sessionId: id,
    at: new Date().toISOString(),
  });

  // Live Expert: POST send_instruction. Simulation: pendingWhisper is consumed on the next agent beat.
  try {
    await fetch(`${EXPERT}/whisper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, tenantSlug: session.tenantSlug, text }),
      signal: AbortSignal.timeout(800),
    });
  } catch {
    // Expert is optional in demo mode.
  }

  return NextResponse.json({ ok: true });
}
