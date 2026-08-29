import { NextResponse } from "next/server";
import { getSession, patchSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as { language?: string };
  if (body.language) {
    patchSession(id, { language: body.language, pendingLanguage: body.language });
  }
  return NextResponse.json({ ok: true });
}
