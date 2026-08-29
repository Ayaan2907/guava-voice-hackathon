import { NextResponse } from "next/server";
import { getSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session });
}
