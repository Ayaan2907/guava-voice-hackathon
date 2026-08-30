import { NextResponse } from "next/server";
import { ensureStore, listSessions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureStore();
  const slug = new URL(req.url).searchParams.get("tenant") ?? undefined;
  return NextResponse.json({ sessions: listSessions(slug) });
}
