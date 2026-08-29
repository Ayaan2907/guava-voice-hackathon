import { NextResponse } from "next/server";
import { addLine, getSession } from "@/lib/store";
import type { TranscriptRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.status === "ended") {
    return NextResponse.json({ error: "Call already ended" }, { status: 409 });
  }
  const body = (await req.json()) as { text?: string; role?: TranscriptRole };
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Empty" }, { status: 400 });
  addLine(id, { role: body.role ?? "caller", text });
  return NextResponse.json({ ok: true });
}
