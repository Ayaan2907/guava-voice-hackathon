import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const expert = process.env.EXPERT_URL ?? "http://127.0.0.1:18766";
  try {
    const res = await fetch(`${expert}/health`, { signal: AbortSignal.timeout(1500) });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, ...body });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
