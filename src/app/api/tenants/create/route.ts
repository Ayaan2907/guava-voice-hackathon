import { NextResponse } from "next/server";
import { ensureStore, getTenant, newId, upsertTenant } from "@/lib/store";
import { slugify } from "@/lib/slug";
import { templateFor } from "@/lib/templates";
import type { Vertical } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    vertical?: Vertical;
    city?: string;
    webrtcCode?: string;
  };
  await ensureStore();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }
  const vertical: Vertical = body.vertical ?? "custom";
  let slug = slugify(name);
  if (getTenant(slug)) slug = `${slug}-${newId("x").slice(-4)}`;
  const tenant = templateFor(vertical, name, slug);
  tenant.role = "customer";
  if (body.city) tenant.city = body.city.trim();
  if (body.webrtcCode?.trim()) tenant.webrtcCode = body.webrtcCode.trim();
  tenant.id = newId("tenant");
  upsertTenant(tenant);
  return NextResponse.json({ tenant });
}
