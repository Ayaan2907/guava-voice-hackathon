import { NextResponse } from "next/server";
import { listSessions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("tenant") ?? undefined;
  return NextResponse.json({ sessions: listSessions(slug) });
}
