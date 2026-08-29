import { NextResponse } from "next/server";
import { getTenant, upsertTenant } from "@/lib/store";
import type { Tenant } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const tenant = getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const tenant = getTenant(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const patch = (await req.json()) as Partial<Tenant>;
  const next = { ...tenant, ...patch, slug: tenant.slug, id: tenant.id };
  upsertTenant(next);
  return NextResponse.json({ tenant: next });
}
